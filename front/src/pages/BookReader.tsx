import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Moon, Plus, Sun } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EpubReader, type ReaderTheme } from '@/components/books/EpubReader'
import { PdfReader } from '@/components/books/PdfReader'
import { MagneticBackButton } from '@/components/MagneticBackButton'
import { SEO } from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { listBooks, type Book, type BookFile } from '@/services/api'
import './BookReader.css'

function isReadable(file: BookFile): boolean {
  return file.format.toLowerCase() === 'pdf' || file.format.toLowerCase() === 'epub'
}

function initialReaderTheme(): ReaderTheme {
  return localStorage.getItem('book-reader-theme') === 'night' ? 'night' : 'paper'
}

function ReaderPreferences({ format, fontSize, theme, onFontSize, onTheme, onFullscreen }: {
  format: string
  fontSize: number
  theme: ReaderTheme
  onFontSize: (size: number) => void
  onTheme: () => void
  onFullscreen: () => void
}) {
  return (
    <details className="book-reader-preferences">
      <summary aria-label="Reading preferences">Aa</summary>
      <div className="reader-preferences-menu">
        {format === 'epub' && (
          <div className="reader-size-control">
            <Button size="icon" variant="ghost" disabled={fontSize <= 80} onClick={() => onFontSize(Math.max(80, fontSize - 10))} aria-label="Decrease font size"><Minus /></Button>
            <span>{fontSize}%</span>
            <Button size="icon" variant="ghost" disabled={fontSize >= 150} onClick={() => onFontSize(Math.min(150, fontSize + 10))} aria-label="Increase font size"><Plus /></Button>
          </div>
        )}
        <Button variant="ghost" onClick={onTheme} aria-label={theme === 'night' ? 'Use paper theme' : 'Use night theme'}>
          {theme === 'night' ? <Sun /> : <Moon />}<span>{theme === 'night' ? 'Light' : 'Dark'}</span>
        </Button>
        <Button variant="ghost" onClick={onFullscreen} aria-label="Enter fullscreen"><Maximize2 /><span>Full screen</span></Button>
      </div>
    </details>
  )
}

export default function BookReader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pageRef = useRef<HTMLElement>(null)
  const [books, setBooks] = useState<Book[] | null>(null)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<ReaderTheme>(initialReaderTheme)
  const [fontSize, setFontSize] = useState(100)

  useEffect(() => {
    listBooks().then(setBooks).catch((loadError) => setError((loadError as Error).message))
  }, [])

  const book = useMemo(() => books?.find((item) => item.id === Number(id)), [books, id])
  const readableFiles = useMemo(() => book?.files.filter(isReadable) ?? [], [book])
  const requestedFileId = Number(searchParams.get('file'))
  const file = readableFiles.find((item) => item.id === requestedFileId) ?? readableFiles[0]

  const changeFile = (fileId: number) => setSearchParams({ file: String(fileId) }, { replace: true })
  const toggleTheme = () => {
    const next = theme === 'paper' ? 'night' : 'paper'
    setTheme(next)
    localStorage.setItem('book-reader-theme', next)
  }
  const enterFullscreen = () => void pageRef.current?.requestFullscreen()

  if (!books && !error) return <div className="reader-route-state">Opening reader…</div>
  if (error) return <div className="reader-route-state"><strong>Could not load the bookshelf.</strong><span>{error}</span><Link to="/books">Back to Books</Link></div>
  if (!book) return <div className="reader-route-state"><strong>Book not found.</strong><Link to="/books">Back to Books</Link></div>
  if (!file) return <div className="reader-route-state"><strong>No readable PDF or EPUB is available.</strong><span>Upload a supported file and enable public access from the dashboard.</span><Link to="/books">Back to Books</Link></div>

  const format = file.format.toLowerCase()
  return (
    <main ref={pageRef} className={`book-reader-page reader-theme-${theme}`}>
      <SEO title={`Read ${book.title}`} description={`Read ${book.title} by ${book.author || 'Unknown author'}.`} path={`/books/${book.id}/read`} />
      <div className="book-reader-back"><MagneticBackButton onClick={() => navigate('/books')} /></div>
      <div className="book-reader-title" aria-label="Current book">
        <strong>{book.title}</strong>
        {book.author && <span>{book.author}</span>}
      </div>
      {readableFiles.length > 1 && (
        <label className="book-reader-file-select">
          <span className="sr-only">Edition</span>
          <select value={file.id} onChange={(event) => changeFile(Number(event.target.value))}>
            {readableFiles.map((item) => <option key={item.id} value={item.id}>{item.format.toUpperCase()}</option>)}
          </select>
        </label>
      )}
      <div className="book-reader-settings">
        <ReaderPreferences
          format={format}
          fontSize={fontSize}
          theme={theme}
          onFontSize={setFontSize}
          onTheme={toggleTheme}
          onFullscreen={enterFullscreen}
        />
      </div>
      <div className="book-reader-surface">
        {format === 'epub'
          ? <EpubReader bookId={book.id} file={file} fontSize={fontSize} theme={theme} />
          : <PdfReader bookId={book.id} file={file} />}
      </div>
    </main>
  )
}
