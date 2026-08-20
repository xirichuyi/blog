import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EpubReader, type ReaderFlow, type ReaderTheme } from '@/components/books/EpubReader'
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

function initialFontSize(): number {
  const saved = Number(localStorage.getItem('book-reader-font-size'))
  return Number.isFinite(saved) ? Math.min(150, Math.max(80, saved)) : 100
}

function initialReaderFlow(): ReaderFlow {
  return localStorage.getItem('book-reader-flow') === 'scrolled' ? 'scrolled' : 'paginated'
}

function ReaderPreferences({ format, flow, fontSize, fullscreen, theme, onFlow, onFontSize, onTheme, onFullscreen }: {
  format: string
  flow: ReaderFlow
  fontSize: number
  fullscreen: boolean
  theme: ReaderTheme
  onFlow: (flow: ReaderFlow) => void
  onFontSize: (size: number) => void
  onTheme: (theme: ReaderTheme) => void
  onFullscreen: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className={open ? 'book-reader-preferences is-open' : 'book-reader-preferences'}>
      <button className="reader-preferences-trigger" type="button" aria-label="Reading preferences" aria-controls="reader-preferences-menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>Aa</button>
      {open && <div id="reader-preferences-menu" className="reader-preferences-menu" role="dialog" aria-label="Reading preferences">
        {format === 'epub' && (
          <>
            <div className="reader-size-control">
              <Button type="button" size="icon" variant="ghost" disabled={fontSize <= 80} onClick={() => onFontSize(Math.max(80, fontSize - 10))} aria-label="Decrease font size"><Minus /></Button>
              <span>{fontSize}%</span>
              <Button type="button" size="icon" variant="ghost" disabled={fontSize >= 150} onClick={() => onFontSize(Math.min(150, fontSize + 10))} aria-label="Increase font size"><Plus /></Button>
            </div>
            <div className="reader-flow-options" role="group" aria-label="Reading mode">
              <button type="button" aria-pressed={flow === 'paginated'} className={flow === 'paginated' ? 'is-selected' : ''} onClick={() => onFlow('paginated')}>Pages</button>
              <button type="button" aria-pressed={flow === 'scrolled'} className={flow === 'scrolled' ? 'is-selected' : ''} onClick={() => onFlow('scrolled')}>Scroll</button>
            </div>
          </>
        )}
        <div className="reader-theme-options" role="group" aria-label="Page appearance">
          <button type="button" aria-pressed={theme === 'paper'} className={theme === 'paper' ? 'is-selected' : ''} onClick={() => onTheme('paper')}><i className="reader-theme-swatch is-paper" />Light</button>
          <button type="button" aria-pressed={theme === 'night'} className={theme === 'night' ? 'is-selected' : ''} onClick={() => onTheme('night')}><i className="reader-theme-swatch is-night" />Dark</button>
        </div>
        <Button type="button" variant="ghost" onClick={onFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>
          {fullscreen ? <Minimize2 /> : <Maximize2 />}<span>{fullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </Button>
      </div>}
    </div>
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
  const [fontSize, setFontSize] = useState(initialFontSize)
  const [flow, setFlow] = useState<ReaderFlow>(initialReaderFlow)
  const [fullscreen, setFullscreen] = useState(false)
  const [uiVisible, setUiVisible] = useState(true)

  useEffect(() => {
    listBooks().then(setBooks).catch((loadError) => setError((loadError as Error).message))
  }, [])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === pageRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  const book = useMemo(() => books?.find((item) => item.id === Number(id)), [books, id])
  const readableFiles = useMemo(() => book?.files.filter(isReadable) ?? [], [book])
  const requestedFileId = Number(searchParams.get('file'))
  const file = readableFiles.find((item) => item.id === requestedFileId) ?? readableFiles[0]

  const changeFile = (fileId: number) => setSearchParams({ file: String(fileId) }, { replace: true })
  const changeTheme = (next: ReaderTheme) => {
    setTheme(next)
    localStorage.setItem('book-reader-theme', next)
  }
  const changeFontSize = (next: number) => {
    setFontSize(next)
    localStorage.setItem('book-reader-font-size', String(next))
  }
  const changeFlow = (next: ReaderFlow) => {
    setFlow(next)
    localStorage.setItem('book-reader-flow', next)
  }
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void pageRef.current?.requestFullscreen()
  }
  const toggleUi = useCallback(() => setUiVisible((current) => !current), [])

  if (!books && !error) return <div className="reader-route-state">Opening reader…</div>
  if (error) return <div className="reader-route-state"><strong>Could not load the bookshelf.</strong><span>{error}</span><Link to="/books">Back to Books</Link></div>
  if (!book) return <div className="reader-route-state"><strong>Book not found.</strong><Link to="/books">Back to Books</Link></div>
  if (!file) return <div className="reader-route-state"><strong>No readable PDF or EPUB is available.</strong><span>Upload a supported file and enable public access from the dashboard.</span><Link to="/books">Back to Books</Link></div>

  const format = file.format.toLowerCase()
  return (
    <main ref={pageRef} className={`book-reader-page reader-theme-${theme}${uiVisible ? '' : ' is-reader-ui-hidden'}`}>
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
          flow={flow}
          fontSize={fontSize}
          fullscreen={fullscreen}
          theme={theme}
          onFlow={changeFlow}
          onFontSize={changeFontSize}
          onTheme={changeTheme}
          onFullscreen={toggleFullscreen}
        />
      </div>
      <div className="book-reader-surface">
        {format === 'epub'
          ? <EpubReader bookId={book.id} file={file} flow={flow} fontSize={fontSize} theme={theme} onToggleUi={toggleUi} />
          : <PdfReader bookId={book.id} file={file} onToggleUi={toggleUi} />}
      </div>
    </main>
  )
}
