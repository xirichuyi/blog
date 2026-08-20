import {
  abortBookUpload,
  beginBookUpload,
  completeBookUpload,
  type VideoMultipartSession,
} from '@/services/admin'
import {
  uploadMultipartParts,
  type MultipartUploadProgress,
} from '@/services/video-upload'
import type { BookFile } from '@/services/api'

export async function uploadBookFileDirect(
  bookId: number,
  file: File,
  onProgress: (progress: MultipartUploadProgress) => void,
  signal: AbortSignal,
): Promise<BookFile> {
  let session: VideoMultipartSession | null = null
  try {
    session = await beginBookUpload(bookId, file)
    const parts = await uploadMultipartParts(file, session, onProgress, signal)
    const uploaded = await completeBookUpload(bookId, file, session, parts)
    onProgress({ uploadedBytes: file.size, totalBytes: file.size, percent: 100 })
    return uploaded
  } catch (error) {
    if (session) await abortBookUpload(session).catch(() => undefined)
    throw error
  }
}
