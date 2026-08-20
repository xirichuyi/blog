export type ReaderProgress =
  | { kind: 'epub'; cfi: string; percent: number }
  | { kind: 'pdf'; page: number; pages: number }

function progressKey(bookId: number, fileId: number): string {
  return `book-reader:${bookId}:${fileId}`
}

export function loadReaderProgress(bookId: number, fileId: number): ReaderProgress | null {
  try {
    const stored = localStorage.getItem(progressKey(bookId, fileId))
    return stored ? JSON.parse(stored) as ReaderProgress : null
  } catch {
    return null
  }
}

export function saveReaderProgress(bookId: number, fileId: number, progress: ReaderProgress): void {
  try {
    localStorage.setItem(progressKey(bookId, fileId), JSON.stringify(progress))
  } catch {
    // Reading still works when storage is unavailable (private mode or quota limits).
  }
}
