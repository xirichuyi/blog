import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Download, Maximize2, Minus, Moon, Plus, Sun } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EpubReader, type ReaderTheme } from '@/components/books/EpubReader'
import { PdfReader } from '@/components/books/PdfReader'
import { SEO } from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { imageUrl, listBooks, type Book, type BookFile } from '@/services/api'
import './BookReader.css'

function isReadable(file: BookFile): boolean {
  return file.format.toLowerCase() === 'pdf' || file.format.toLowerCase() === 'epub'
}

function initialReaderTheme(): ReaderTheme {
  return localStorage.getItem('book-reader-theme') === 'night' ? 'night' : 'paper'
}

function ReaderHeader({ book, file, files, onFileChange }: {
  book: Book
  file: BookFile
  files: BookFile[]
  onFileChange: (fileId: number) => void
}) {
  return (
    <header className="book-reader-header">
      <Button asChild size="icon" variant="ghost"><Link to="/books" aria-label="Back to bookshelf"><ArrowLeft /></Link></Button>
      <div className="book-reader-identity">
        <BookOpen />
        <div><strong>{book.title}</strong><span>{book.author || file.file_name}</span></div>
      </div>
      {files.length > 1 && (
        <label className="book-reader-file-select">
          <span>Edition</span>
          <select value={file.id} onChange={(event) => onFileChange(Number(event.target.value))}>
            {files.map((item) => <option key={item.id} value={item.id}>{item.format.toUpperCase()}</option>)}
          </select>
        </label>
      )}
      {book.download_enabled && <Button asChild size="icon" variant="ghost"><a href={file.file_url} download aria-label="Download book"><Download /></a></Button>}
    </header>
  )
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
    <div className="book-reader-preferences" aria-label="Reading preferences">
      {format === 'epub' && (
        <>
          <Button size="icon" variant="ghost" disabled={fontSize <= 80} onClick={() => onFontSize(Math.max(80, fontSize - 10))} aria-label="Decrease font size"><Minus /></Button>
          <span className="reader-font-size">Aa</span>
          <Button size="icon" variant="ghost" disabled={fontSize >= 150} onClick={() => onFontSize(Math.min(150, fontSize + 10))} aria-label="Increase font size"><Plus /></Button>
          <span className="reader-control-divider" />
        </>
      )}
      <Button size="icon" variant="ghost" onClick={onTheme} aria-label={theme === 'night' ? 'Use paper theme' : 'Use night theme'}>{theme === 'night' ? <Sun /> : <Moon />}</Button>
      <Button size="icon" variant="ghost" onClick={onFullscreen} aria-label="Enter fullscreen"><Maximize2 /></Button>
    </div>
  )
}

export default function BookReader() {
  const { id } = useParams()
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
      <ReaderHeader book={book} file={file} files={readableFiles} onFileChange={changeFile} />
      <ReaderPreferences
        format={format}
        fontSize={fontSize}
        theme={theme}
        onFontSize={setFontSize}
        onTheme={toggleTheme}
        onFullscreen={enterFullscreen}
      />
      <div className="book-reader-surface">
        {format === 'epub'
          ? <EpubReader bookId={book.id} file={file} fontSize={fontSize} theme={theme} />
          : <PdfReader bookId={book.id} file={file} />}
      </div>
      {book.download_enabled && <a className="book-reader-source" href={imageUrl(file.file_url)} target="_blank" rel="noreferrer">Open original file</a>}
    </main>
  )
}
