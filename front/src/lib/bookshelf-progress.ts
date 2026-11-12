import { apiRequest } from '@/services/http'
import { loadReaderProgress, type ReaderProgress } from './book-progress'
import { validPosition } from './reader-state'

/** Read only: viewing the shelf must never import, flush or overwrite reader data. */
export async function loadBookshelfProgress(bookId: number, fileId: number, format: string, email: string | null, signal: AbortSignal): Promise<ReaderProgress | null> {
  const valid = (value: unknown): value is ReaderProgress => validPosition(value) && value.kind === format.toLowerCase()
  let cached: ReaderProgress | null = null
  let dirty = false
  let hasCache = false
  try {
    const value = JSON.parse(localStorage.getItem(`reader-v2:${email ? encodeURIComponent(email) : 'guest'}:${bookId}:${fileId}`) || 'null')
    if (value?.data && (value.data.progress === null || valid(value.data.progress))) {
      hasCache = true
      cached = value.data.progress
      dirty = value.dirty === true
    }
  } catch { /* Invalid or unavailable storage is not a reading record. */ }
  const legacy = loadReaderProgress(bookId, fileId)
  const fallback = hasCache ? cached : valid(legacy) ? legacy : null
  if (!email || dirty) return fallback
  try {
    const remote = await apiRequest<{ revision: number; progress: unknown }>(`/books/${bookId}/files/${fileId}/reader`, {
      credentials: 'include', headers: { 'X-Reader-Account': email }, signal,
    })
    if (valid(remote.progress)) return remote.progress
    // Match the reader's migration of old positions for a never-saved edition.
    if (remote.progress === null) return remote.revision === 0 ? fallback : null
  } catch { /* Keep this account's local position when offline. */ }
  return fallback
}
