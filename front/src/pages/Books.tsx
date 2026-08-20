import { useEffect, useMemo, useState } from 'react'
import { BookOpen, LibraryBig, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SEO } from '@/components/SEO'
import {
  bookFileContentUrl,
  imageUrl,
  listBooks,
  type Book,
  type BookFile,
  type ReadingStatus,
} from '@/services/api'
import './Books.css'

const STATUS: Record<ReadingStatus, string> = {
  reading: 'Reading',
  finished: 'Finished',
  want_to_read: 'Up next',
  paused: 'Paused',
}

function readableFile(book: Book): BookFile | undefined {
  return book.files.find((file) => ['epub', 'pdf'].includes(file.format.toLowerCase()))
}

function useBookCover(book: Book): string | undefined {
  const storedCover = imageUrl(book.cover_url ?? undefined)
  const epubFile = book.files.find((file) => file.format.toLowerCase() === 'epub')
  const [embeddedCover, setEmbeddedCover] = useState<string>()

  useEffect(() => {
    if (storedCover || !epubFile) return
    let disposed = false
    let objectUrl: string | undefined

    const loadEmbeddedCover = async () => {
      const response = await fetch(bookFileContentUrl(book.id, epubFile.id))
      if (!response.ok) return
      const { default: createEpub } = await import('epubjs')
      const epub = createEpub(await response.arrayBuffer())
      try {
        const coverUrl = await epub.coverUrl()
        if (!coverUrl) return
        const coverBlob = await fetch(coverUrl).then((coverResponse) => coverResponse.blob())
        if (disposed) return
        objectUrl = URL.createObjectURL(coverBlob)
        setEmbeddedCover(objectUrl)
      } finally {
        epub.destroy()
      }
    }

    void loadEmbeddedCover().catch(() => undefined)
    return () => {
      disposed = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [book.id, epubFile?.id, storedCover])

  return storedCover || embeddedCover
}

function BookCover({ book }: { book: Book }) {
  const cover = useBookCover(book)
  return (
    <span className="library-book-cover">
      {cover
        ? <img src={cover} alt={`Cover of ${book.title}`} />
        : <span className="library-book-fallback"><BookOpen /><strong>{book.title}</strong></span>}
      <span className="library-book-pages" aria-hidden="true" />
    </span>
  )
}

function BookCard({ book }: { book: Book }) {
  const file = readableFile(book)
  const content = (
    <>
      <BookCover book={book} />
      <span className="library-book-copy">
        <span className="library-book-status">{STATUS[book.reading_status]}</span>
        <strong>{book.title}</strong>
        <small>{book.author || 'Unknown author'}</small>
        {book.reading_status === 'reading' && (
          <span className="library-book-progress" aria-label={`${book.progress}% read`}>
            <i style={{ width: `${book.progress}%` }} />
          </span>
        )}
        <span className="library-book-action">{file ? `Read ${file.format.toUpperCase()} →` : 'Reading notes only'}</span>
      </span>
    </>
  )

  return file ? (
    <Link className="library-book" to={`/books/${book.id}/read?file=${file.id}`} aria-label={`Read ${book.title}`}>
      {content}
    </Link>
  ) : (
    <article className="library-book is-unavailable">{content}</article>
  )
}

function EmptyBookshelf() {
  return (
    <div className="library-empty">
      <LibraryBig />
      <h2>The shelf is still empty</h2>
      <p>Add an EPUB from the dashboard and it will appear here.</p>
    </div>
  )
}

export default function Books() {
  const [books, setBooks] = useState<Book[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listBooks().then(setBooks).catch((loadError) => setError((loadError as Error).message))
  }, [])

  const grouped = useMemo(() => {
    const groups = new Map<ReadingStatus, Book[]>()
    for (const book of books ?? []) {
      groups.set(book.reading_status, [...(groups.get(book.reading_status) ?? []), book])
    }
    return groups
  }, [books])

  return (
    <main className="library-page mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <SEO title="Books" description="Books in progress, finished volumes, and reading notes." path="/books" />
      <header className="library-header">
        <p>Personal library</p>
        <h1>Books</h1>
        <p>Reading now, finished, and saved for later.</p>
      </header>

      {!books && !error && <div className="library-loading"><Loader2 /> Loading shelf…</div>}
      {error && <p className="py-8 text-sm text-destructive">Could not load the shelf: {error}</p>}
      {books?.length === 0 && <EmptyBookshelf />}

      <div className="library-groups">
        {(['reading', 'finished', 'want_to_read', 'paused'] as ReadingStatus[]).map((status) => {
          const items = grouped.get(status)
          if (!items?.length) return null
          return (
            <section className="library-group" key={status}>
              <header><h2>{STATUS[status]}</h2><span>{items.length}</span></header>
              <div className="library-grid">
                {items.map((book) => <BookCard book={book} key={book.id} />)}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
