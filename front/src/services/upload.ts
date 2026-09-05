import type { BookFile } from '@/services/api'
import { adminRequest } from '@/services/admin'
import { ApiError } from '@/services/http'

const MAX_PARALLEL_PARTS = 3
const MAX_PART_ATTEMPTS = 3
const IMAGE_COMPRESSION_THRESHOLD = 1024 * 1024
const IMAGE_MAX_EDGE = 2560
const IMAGE_WEBP_QUALITY = 0.84
const PENDING_UPLOADS_KEY = 'blog.pending-multipart-uploads.v1'
const PENDING_UPLOAD_MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000
const FINGERPRINT_SAMPLE_BYTES = 1024 * 1024

export type UploadKind = 'image' | 'video' | 'book'

export interface UploadProgress {
  uploadedBytes: number
  totalBytes: number
  percent: number
}

interface UploadPart {
  part_number: number
  upload_url: string
}

interface UploadSession {
  mode: 'single' | 'multipart'
  upload_id?: string
  key: string
  public_url: string
  upload_url?: string
  part_size?: number
  parts: UploadPart[]
  completed_parts?: CompletedUploadPart[]
}

interface CompletedUploadPart {
  part_number: number
  etag: string
}

interface PendingUpload {
  fingerprint: string
  key: string
  uploadId: string
  createdAt: number
}

interface CompleteUploadResponse {
  public_url: string
  book_file?: BookFile
}

interface UploadOptions {
  kind: UploadKind
  bookId?: number
  onProgress?: (progress: UploadProgress) => void
  signal?: AbortSignal
}

/**
 * The only file-upload entrypoint. The API returns short-lived signed URLs;
 * every file byte goes from the browser directly to Cloudflare R2.
 */
export async function uploadToR2(file: File, options: UploadOptions): Promise<CompleteUploadResponse> {
  const contentType = contentTypeFor(file, options.kind)
  const signal = options.signal ?? new AbortController().signal
  const onProgress = options.onProgress ?? (() => undefined)
  const fingerprint = await uploadFingerprint(file, options)
  const session = await beginOrResumeUpload(file, contentType, options, fingerprint)

  try {
    if (session.mode === 'single') {
      if (!session.upload_url) throw new Error('R2 没有返回直传地址')
      await uploadSingle(file, contentType, session.upload_url, onProgress, signal)
      return { public_url: session.public_url }
    }

    if (!session.upload_id || !session.part_size) throw new Error('R2 分片会话不完整')
    const parts = await uploadMultipart(file, session, onProgress, signal)
    const result = await completeUpload(file, contentType, options, session, parts)
    clearPendingUpload(fingerprint)
    onProgress({ uploadedBytes: file.size, totalBytes: file.size, percent: 100 })
    return result
  } catch (error) {
    if (session.mode === 'multipart' && session.upload_id) {
      if (signal.aborted || (error as Error).name === 'AbortError') {
        await abortUpload(session).catch(() => undefined)
        clearPendingUpload(fingerprint)
      } else {
        const message = (error as Error).message || '上传失败'
        throw new Error(`${message}。上传进度已保留，重新选择同一文件即可继续。`)
      }
    }
    throw error
  }
}

export async function uploadImageDirect(file: File, signal?: AbortSignal): Promise<string> {
  const prepared = await prepareImageForUpload(file, signal)
  return (await uploadToR2(prepared, { kind: 'image', signal })).public_url
}

export async function uploadVideoDirect(
  file: File,
  onProgress: (progress: UploadProgress) => void,
  signal: AbortSignal,
): Promise<{ url: string; title: string }> {
  const result = await uploadToR2(file, { kind: 'video', onProgress, signal })
  return { url: result.public_url, title: file.name.replace(/\.[^.]+$/, '') }
}

export async function uploadBookFileDirect(
  bookId: number,
  file: File,
  onProgress: (progress: UploadProgress) => void,
  signal: AbortSignal,
): Promise<BookFile> {
  const result = await uploadToR2(file, { kind: 'book', bookId, onProgress, signal })
  if (!result.book_file) throw new Error('书籍文件上传后未能登记')
  return result.book_file
}

async function beginUpload(
  file: File,
  contentType: string,
  options: UploadOptions,
): Promise<UploadSession> {
  return adminRequest<UploadSession>('/admin/uploads', {
    method: 'POST',
    body: JSON.stringify({
      kind: options.kind,
      book_id: options.bookId,
      file_name: file.name,
      content_type: contentType,
      file_size: file.size,
    }),
  })
}

async function beginOrResumeUpload(
  file: File,
  contentType: string,
  options: UploadOptions,
  fingerprint: string,
): Promise<UploadSession> {
  if (options.kind !== 'image') {
    const pending = findPendingUpload(fingerprint)
    if (pending) {
      try {
        return await adminRequest<UploadSession>('/admin/uploads/resume', {
          method: 'POST',
          body: JSON.stringify({
            kind: options.kind,
            book_id: options.bookId,
            key: pending.key,
            upload_id: pending.uploadId,
            file_name: file.name,
            content_type: contentType,
            file_size: file.size,
          }),
        })
      } catch (error) {
        if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
          clearPendingUpload(fingerprint)
        } else {
          throw error
        }
      }
    }
  }

  const session = await beginUpload(file, contentType, options)
  if (session.mode === 'multipart' && session.upload_id) {
    savePendingUpload({
      fingerprint,
      key: session.key,
      uploadId: session.upload_id,
      createdAt: Date.now(),
    })
  }
  return session
}

async function completeUpload(
  file: File,
  contentType: string,
  options: UploadOptions,
  session: UploadSession,
  parts: CompletedUploadPart[],
): Promise<CompleteUploadResponse> {
  return adminRequest<CompleteUploadResponse>('/admin/uploads/complete', {
    method: 'POST',
    body: JSON.stringify({
      kind: options.kind,
      book_id: options.bookId,
      key: session.key,
      upload_id: session.upload_id,
      parts,
      file_name: file.name,
      content_type: contentType,
      file_size: file.size,
    }),
  })
}

async function abortUpload(session: UploadSession): Promise<void> {
  await adminRequest('/admin/uploads/abort', {
    method: 'POST',
    body: JSON.stringify({ key: session.key, upload_id: session.upload_id }),
  })
}

function uploadSingle(
  file: File,
  contentType: string,
  uploadUrl: string,
  onProgress: (progress: UploadProgress) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const abort = () => request.abort()
    const cleanup = () => signal.removeEventListener('abort', abort)
    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', contentType)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) reportProgress(event.loaded, file.size, onProgress, 100)
    }
    request.onload = () => {
      cleanup()
      if (request.status >= 200 && request.status < 300) {
        reportProgress(file.size, file.size, onProgress, 100)
        resolve()
      } else {
        reject(new Error(`R2 直传失败 (${request.status})`))
      }
    }
    request.onerror = () => {
      cleanup()
      reject(new Error('R2 直传网络失败'))
    }
    request.onabort = () => {
      cleanup()
      reject(new DOMException('上传已取消', 'AbortError'))
    }
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
    request.send(file)
  })
}

async function uploadMultipart(
  file: File,
  session: UploadSession,
  onProgress: (progress: UploadProgress) => void,
  signal: AbortSignal,
): Promise<CompletedUploadPart[]> {
  const partSize = session.part_size
  if (!partSize) throw new Error('R2 分片大小无效')
  const controller = new AbortController()
  const abort = () => controller.abort(signal.reason)
  if (signal.aborted) abort()
  else signal.addEventListener('abort', abort, { once: true })

  const uploadedByPart = new Map<number, number>()
  const completed = [...(session.completed_parts ?? [])]
  for (const part of completed) {
    const start = (part.part_number - 1) * partSize
    uploadedByPart.set(part.part_number, Math.min(partSize, file.size - start))
  }
  if (uploadedByPart.size > 0) {
    const uploaded = Array.from(uploadedByPart.values()).reduce((sum, value) => sum + value, 0)
    reportProgress(uploaded, file.size, onProgress, 99)
  }
  let nextIndex = 0
  const updatePartProgress = (partNumber: number, bytes: number) => {
    uploadedByPart.set(partNumber, bytes)
    const uploaded = Array.from(uploadedByPart.values()).reduce((sum, value) => sum + value, 0)
    reportProgress(uploaded, file.size, onProgress, 99)
  }
  const worker = async () => {
    while (nextIndex < session.parts.length) {
      controller.signal.throwIfAborted()
      const part = session.parts[nextIndex++]
      const start = (part.part_number - 1) * partSize
      const blob = file.slice(start, Math.min(start + partSize, file.size))
      const etag = await uploadPartWithRetry(part, blob, updatePartProgress, controller.signal)
      completed.push({ part_number: part.part_number, etag })
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_PARTS, session.parts.length) }, worker))
    return completed.sort((left, right) => left.part_number - right.part_number)
  } catch (error) {
    controller.abort(error)
    throw error
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

async function uploadPartWithRetry(
  part: UploadPart,
  blob: Blob,
  onProgress: (partNumber: number, bytes: number) => void,
  signal: AbortSignal,
): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_PART_ATTEMPTS; attempt += 1) {
    signal.throwIfAborted()
    onProgress(part.part_number, 0)
    try {
      return await uploadPart(part, blob, onProgress, signal)
    } catch (error) {
      if (signal.aborted) throw error
      lastError = error
      if (attempt < MAX_PART_ATTEMPTS) await retryDelay(attempt, signal)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('R2 分片上传失败')
}

function uploadPart(
  part: UploadPart,
  blob: Blob,
  onProgress: (partNumber: number, bytes: number) => void,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const abort = () => request.abort()
    const cleanup = () => signal.removeEventListener('abort', abort)
    request.open('PUT', part.upload_url)
    request.setRequestHeader('Content-Type', 'application/octet-stream')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(part.part_number, event.loaded)
    }
    request.onload = () => {
      cleanup()
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`R2 分片 ${part.part_number} 上传失败 (${request.status})`))
        return
      }
      const etag = request.getResponseHeader('ETag')
      if (!etag) {
        reject(new Error('R2 没有暴露 ETag，请检查存储桶 CORS 的 ExposeHeaders 配置'))
        return
      }
      onProgress(part.part_number, blob.size)
      resolve(etag)
    }
    request.onerror = () => {
      cleanup()
      reject(new Error(`R2 分片 ${part.part_number} 网络上传失败`))
    }
    request.onabort = () => {
      cleanup()
      reject(new DOMException('上传已取消', 'AbortError'))
    }
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
    request.send(blob)
  })
}

async function uploadFingerprint(file: File, options: UploadOptions): Promise<string> {
  const metadata = new TextEncoder().encode(JSON.stringify([
    options.kind,
    options.bookId ?? null,
    file.name,
    file.size,
    file.lastModified,
    file.type,
  ]))
  const head = new Uint8Array(await file.slice(0, FINGERPRINT_SAMPLE_BYTES).arrayBuffer())
  const tailStart = Math.max(FINGERPRINT_SAMPLE_BYTES, file.size - FINGERPRINT_SAMPLE_BYTES)
  const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer())
  const input = new Uint8Array(metadata.length + head.length + tail.length)
  input.set(metadata)
  input.set(head, metadata.length)
  input.set(tail, metadata.length + head.length)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readPendingUploads(): PendingUpload[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_UPLOADS_KEY) ?? '[]') as PendingUpload[]
    const cutoff = Date.now() - PENDING_UPLOAD_MAX_AGE_MS
    return parsed.filter((upload) =>
      typeof upload.fingerprint === 'string'
      && typeof upload.key === 'string'
      && typeof upload.uploadId === 'string'
      && upload.createdAt >= cutoff)
  } catch {
    return []
  }
}

function findPendingUpload(fingerprint: string): PendingUpload | undefined {
  return readPendingUploads().find((upload) => upload.fingerprint === fingerprint)
}

function savePendingUpload(upload: PendingUpload): void {
  try {
    const pending = readPendingUploads().filter((item) => item.fingerprint !== upload.fingerprint)
    localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify([...pending, upload].slice(-10)))
  } catch {
    // Uploading still works when storage is unavailable; only cross-page resume is lost.
  }
}

function clearPendingUpload(fingerprint: string): void {
  try {
    const pending = readPendingUploads().filter((upload) => upload.fingerprint !== fingerprint)
    localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(pending))
  } catch {
    // Ignore browsers that block local storage.
  }
}

function reportProgress(
  uploadedBytes: number,
  totalBytes: number,
  callback: (progress: UploadProgress) => void,
  maxPercent: number,
) {
  callback({
    uploadedBytes,
    totalBytes,
    percent: Math.min(maxPercent, Math.round((uploadedBytes / totalBytes) * 100)),
  })
}

function contentTypeFor(file: File, kind: UploadKind): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (kind === 'image') {
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
    if (extension === 'png') return 'image/png'
    if (extension === 'gif') return 'image/gif'
    if (extension === 'webp') return 'image/webp'
  }
  if (kind === 'video') {
    if (extension === 'webm') return 'video/webm'
    if (extension === 'mov') return 'video/quicktime'
    if (extension === 'm4v') return 'video/x-m4v'
    return 'video/mp4'
  }
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'epub') return 'application/epub+zip'
  return 'application/octet-stream'
}

function retryDelay(attempt: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      reject(new DOMException('上传已取消', 'AbortError'))
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, attempt * 750)
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}

/**
 * Resize oversized still images and encode them as WebP in the browser. GIFs
 * are kept intact so animation is never lost. The resulting file still goes
 * straight from the browser to R2.
 */
async function prepareImageForUpload(file: File, signal?: AbortSignal): Promise<File> {
  if (file.type === 'image/gif' || file.type === 'image/webp') return file
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') return file
  signal?.throwIfAborted()

  const image = await loadLocalImage(file)
  signal?.throwIfAborted()
  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const shouldCompress = scale < 1 || file.size > IMAGE_COMPRESSION_THRESHOLD
  if (!shouldCompress) return file

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', IMAGE_WEBP_QUALITY)
  })
  signal?.throwIfAborted()
  if (!blob || (scale === 1 && blob.size >= file.size)) return file

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${baseName}.webp`, {
    type: 'image/webp',
    lastModified: file.lastModified,
  })
}

function loadLocalImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    const cleanup = () => URL.revokeObjectURL(objectUrl)
    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('无法读取这张图片'))
    }
    image.src = objectUrl
  })
}
