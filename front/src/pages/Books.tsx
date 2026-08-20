import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { BookOpen, Download, LibraryBig, Loader2, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Markdown } from '@/components/Markdown'
import { SEO } from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { imageUrl, listBooks, type Book, type ReadingStatus } from '@/services/api'
import './Books.css'

const STATUS: Record<ReadingStatus, string> = {
  reading: 'Reading',
  finished: 'Finished',
  want_to_read: 'Up next',
  paused: 'Paused',
}

const STATUS_NOTE: Record<ReadingStatus, string> = {
  reading: 'Open now, one page at a time.',
  finished: 'Read, remembered, and worth keeping close.',
  want_to_read: 'Waiting for the right afternoon.',
  paused: 'Bookmarked for another day.',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function BookVolume({ book, selected, onSelect }: { book: Book; selected: boolean; onSelect: () => void }) {
  const bookStyle = { '--book-lean': `${(book.id % 5) - 2}deg` } as CSSProperties

  return (
    <button
      type="button"
      className="book-volume"
      style={bookStyle}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`View reading notes for ${book.title}`}
    >
      <span className="book-volume-object">
        <span className="book-volume-spine" aria-hidden="true">
          <span>{book.title}</span>
        </span>
        <span className="book-volume-cover">
          {book.cover_url ? (
            <img src={imageUrl(book.cover_url)} alt="" />
          ) : (
            <span className="book-volume-fallback" aria-hidden="true">
              <BookOpen />
              <strong>{book.title}</strong>
              {book.author && <small>{book.author}</small>}
            </span>
          )}
          <span className="book-volume-sheen" aria-hidden="true" />
          <span className="book-volume-caption">
            <strong>{book.title}</strong>
            <small>{book.author || 'Unknown author'}</small>
          </span>
          {book.reading_status === 'reading' && (
            <span className="book-volume-progress" style={{ width: `${book.progress}%` }} aria-hidden="true" />
          )}
        </span>
        <span className="book-volume-pages" aria-hidden="true" />
      </span>
    </button>
  )
}

function Rating({ value }: { value: number }) {
  return (
    <span className="bookshelf-rating" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={index < value ? 'filled' : undefined} aria-hidden="true" />
      ))}
    </span>
  )
}

function BookDetails({ book }: { book: Book }) {
  return (
    <div className="bookshelf-detail">
      <div className="bookshelf-detail-heading">
        <div>
          <p>{STATUS[book.reading_status]} · Selected volume</p>
          <h3>{book.title}</h3>
          {book.author && <span>{book.author}</span>}
        </div>
        {book.rating && <Rating value={book.rating} />}
      </div>

      {book.reading_status === 'reading' && (
        <div className="bookshelf-reading-progress">
          <div><span>Reading progress</span><strong>{book.progress}%</strong></div>
          <span><i style={{ width: `${book.progress}%` }} /></span>
        </div>
      )}

      {book.description && <p className="bookshelf-description">{book.description}</p>}
      {book.notes && <div className="bookshelf-notes"><Markdown content={book.notes} /></div>}
      {book.files.length > 0 && (
        <div className="bookshelf-downloads">
          {book.files.map((file) => (
            <div className="bookshelf-file-actions" key={file.id}>
              {(file.format.toLowerCase() === 'pdf' || file.format.toLowerCase() === 'epub') && (
                <Button asChild size="sm">
                  <Link to={`/books/${book.id}/read?file=${file.id}`}><BookOpen /> Read {file.format.toUpperCase()}</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <a href={file.file_url} target="_blank" rel="noreferrer" download>
                  <Download /> {file.format.toUpperCase()} · {formatBytes(file.file_size)}
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BookshelfSection({
  status,
  books,
  selectedBookId,
  onSelect,
}: {
  status: ReadingStatus
  books: Book[]
  selectedBookId: number | null
  onSelect: (bookId: number) => void
}) {
  const selectedBook = books.find((book) => book.id === selectedBookId)

  return (
    <section className="bookshelf-section">
      <header className="bookshelf-section-header">
        <div>
          <p>{STATUS[status]}</p>
          <h2>{STATUS_NOTE[status]}</h2>
        </div>
        <span>{String(books.length).padStart(2, '0')} VOLUMES</span>
      </header>
      <div className="bookshelf-stage">
        <div className="bookshelf-row" role="list" aria-label={`${STATUS[status]} shelf`}>
          {books.map((book) => (
            <div role="listitem" key={book.id}>
              <BookVolume
                book={book}
                selected={book.id === selectedBookId}
                onSelect={() => onSelect(book.id)}
              />
            </div>
          ))}
        </div>
        <div className="bookshelf-board" aria-hidden="true"><span /></div>
      </div>
      {selectedBook && <BookDetails book={selectedBook} />}
    </section>
  )
}

function EmptyBookshelf() {
  return (
    <div className="empty-bookshelf">
      <div className="empty-bookshelf-books" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="bookshelf-board"><span /></div>
      <LibraryBig />
      <h2>The shelf is still empty</h2>
      <p>Add your first book from the dashboard and it will take its place here.</p>
    </div>
  )
}

export default function Books() {
  const [books, setBooks] = useState<Book[] | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listBooks().then(setBooks).catch((loadError) => setError((loadError as Error).message))
  }, [])

  useEffect(() => {
    if (!books?.length) return
    setSelectedBookId((current) => current && books.some((book) => book.id === current) ? current : books[0].id)
  }, [books])

  const grouped = useMemo(() => {
    const groups = new Map<ReadingStatus, Book[]>()
    for (const book of books ?? []) {
      groups.set(book.reading_status, [...(groups.get(book.reading_status) ?? []), book])
    }
    return groups
  }, [books])

  return (
    <main className="library-page mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <SEO title="Books" description="Books in progress, finished volumes, and reading notes." path="/books" />
      <header className="library-header">
        <div>
          <p>Personal library</p>
          <h1>Bookshelf</h1>
          <p>Books in progress, finished volumes, and the ones worth keeping close.</p>
        </div>
      </header>

      {!books && !error && <div className="library-loading"><Loader2 /> Loading shelf…</div>}
      {error && <p className="py-8 text-sm text-destructive">Could not load the shelf: {error}</p>}
      {books?.length === 0 && <EmptyBookshelf />}

      <div className="library-stacks">
        {(['reading', 'finished', 'want_to_read', 'paused'] as ReadingStatus[]).map((status) => {
          const items = grouped.get(status)
          if (!items?.length) return null
          return (
            <BookshelfSection
              key={status}
              status={status}
              books={items}
              selectedBookId={selectedBookId}
              onSelect={setSelectedBookId}
            />
          )
        })}
      </div>
    </main>
  )
}
