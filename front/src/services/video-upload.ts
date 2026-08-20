import {
  abortVideoUpload,
  beginVideoUpload,
  completeVideoUpload,
  type CompletedVideoPart,
  type VideoMultipartSession,
  type VideoUploadPart,
} from '@/services/admin'

const MAX_PARALLEL_PARTS = 3
const MAX_PART_ATTEMPTS = 3

export interface MultipartUploadProgress {
  uploadedBytes: number
  totalBytes: number
  percent: number
}

export type VideoUploadProgress = MultipartUploadProgress

export interface UploadedVideo {
  url: string
  title: string
}

export async function uploadVideoDirect(
  file: File,
  onProgress: (progress: VideoUploadProgress) => void,
  signal: AbortSignal,
): Promise<UploadedVideo> {
  const contentType = videoContentType(file)
  let session: VideoMultipartSession | null = null

  try {
    session = await beginVideoUpload(file, contentType)
    const parts = await uploadMultipartParts(file, session, onProgress, signal)
    const url = await completeVideoUpload(session, parts)
    onProgress({ uploadedBytes: file.size, totalBytes: file.size, percent: 100 })
    return { url, title: file.name.replace(/\.[^.]+$/, '') }
  } catch (error) {
    if (session) await abortVideoUpload(session).catch(() => undefined)
    throw error
  }
}

function videoContentType(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'webm') return 'video/webm'
  if (extension === 'mov') return 'video/quicktime'
  if (extension === 'm4v') return 'video/x-m4v'
  return 'video/mp4'
}

export async function uploadMultipartParts(
  file: File,
  session: VideoMultipartSession,
  onProgress: (progress: MultipartUploadProgress) => void,
  signal: AbortSignal,
): Promise<CompletedVideoPart[]> {
  const uploadController = new AbortController()
  const abortUploads = () => uploadController.abort(signal.reason)
  if (signal.aborted) abortUploads()
  else signal.addEventListener('abort', abortUploads, { once: true })

  const uploadedByPart = new Map<number, number>()
  const completed: CompletedVideoPart[] = []
  let nextIndex = 0

  const reportProgress = (partNumber: number, uploadedBytes: number) => {
    uploadedByPart.set(partNumber, uploadedBytes)
    const totalUploaded = Array.from(uploadedByPart.values()).reduce((sum, value) => sum + value, 0)
    onProgress({
      uploadedBytes: totalUploaded,
      totalBytes: file.size,
      percent: Math.min(99, Math.round((totalUploaded / file.size) * 100)),
    })
  }

  const worker = async () => {
    while (nextIndex < session.parts.length) {
      uploadController.signal.throwIfAborted()
      const part = session.parts[nextIndex]
      nextIndex += 1
      const blob = slicePart(file, session.part_size, part.part_number)
      const etag = await uploadPartWithRetry(part, blob, reportProgress, uploadController.signal)
      completed.push({ part_number: part.part_number, etag })
    }
  }

  const workerCount = Math.min(MAX_PARALLEL_PARTS, session.parts.length)
  try {
    await Promise.all(Array.from({ length: workerCount }, worker))
    return completed.sort((left, right) => left.part_number - right.part_number)
  } catch (error) {
    uploadController.abort(error)
    throw error
  } finally {
    signal.removeEventListener('abort', abortUploads)
  }
}

function slicePart(file: File, partSize: number, partNumber: number): Blob {
  const start = (partNumber - 1) * partSize
  return file.slice(start, Math.min(start + partSize, file.size), 'application/octet-stream')
}

async function uploadPartWithRetry(
  part: VideoUploadPart,
  blob: Blob,
  onProgress: (partNumber: number, uploadedBytes: number) => void,
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
  part: VideoUploadPart,
  blob: Blob,
  onProgress: (partNumber: number, uploadedBytes: number) => void,
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
    signal.addEventListener('abort', abort, { once: true })
    request.send(blob)
  })
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
    signal.addEventListener('abort', abort, { once: true })
  })
}
