import { readPreference, writePreference } from '@/lib/browser-storage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EpubReader, type ReaderFlow, type ReaderTheme } from '@/components/books/EpubReader'
import { ReaderWorkspace, ReaderAccount } from '@/components/books/ReaderWorkspace'
import { PdfReader } from '@/components/books/PdfReader'
import { SEO } from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { isReaderHoverDevice } from '@/lib/reader-gestures'
import { imageUrl, listBooks, type Book, type BookFile } from '@/services/api'
import './BookReader.css'

function isReadable(file: BookFile): boolean {
  return file.format.toLowerCase() === 'pdf' || file.format.toLowerCase() === 'epub'
}

function initialReaderTheme(): ReaderTheme {
  return readPreference('book-reader-theme') === 'night' ? 'night' : 'paper'
}

const DEFAULT_READER_FONT_SIZE = 100

function initialFontSize(): number {
  const stored = readPreference('book-reader-font-size')
  if (!stored) return DEFAULT_READER_FONT_SIZE
  const saved = Number(stored)
  return Number.isFinite(saved) ? Math.min(150, Math.max(80, saved)) : DEFAULT_READER_FONT_SIZE
}

function initialReaderFlow(): ReaderFlow {
  return readPreference('book-reader-flow') === 'scrolled' ? 'scrolled' : 'paginated'
}

function ReaderPreferences({ format, flow, fontSize, fullscreen, theme, visible, onFlow, onFontSize, onTheme, onFullscreen, files, fileId, onFile }: {
  files: BookFile[]
  fileId: number
  onFile: (id: number) => void
  format: string
  flow: ReaderFlow
  fontSize: number
  fullscreen: boolean
  theme: ReaderTheme
  visible: boolean
  onFlow: (flow: ReaderFlow) => void
  onFontSize: (size: number) => void
  onTheme: (theme: ReaderTheme) => void
  onFullscreen: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!visible) setOpen(false)
  }, [visible])

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
              <button type="button" aria-pressed={flow === 'paginated'} className={flow === 'paginated' ? 'is-selected' : ''} onClick={() => onFlow('paginated')}>翻页</button>
              <button type="button" aria-pressed={flow === 'scrolled'} className={flow === 'scrolled' ? 'is-selected' : ''} onClick={() => onFlow('scrolled')}>滚动</button>
            </div>
          </>
        )}
        <div className="reader-theme-options" role="group" aria-label="Page appearance">
          <button type="button" aria-pressed={theme === 'paper'} className={theme === 'paper' ? 'is-selected' : ''} onClick={() => onTheme('paper')}><i className="reader-theme-swatch is-paper" />浅色</button>
          <button type="button" aria-pressed={theme === 'night'} className={theme === 'night' ? 'is-selected' : ''} onClick={() => onTheme('night')}><i className="reader-theme-swatch is-night" />深色</button>
        </div>
        <Button type="button" variant="ghost" onClick={onFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>
          {fullscreen ? <Minimize2 /> : <Maximize2 />}<span>{fullscreen ? '退出全屏' : '全屏阅读'}</span>
        </Button>
        {files.length > 1 && <label className="reader-edition">版本<select aria-label="阅读版本" value={fileId} onChange={event => onFile(Number(event.target.value))}>{files.map(file => <option key={file.id} value={file.id}>{file.format.toUpperCase()}</option>)}</select></label>}
        <ReaderAccount />
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
  const [fullscreenError, setFullscreenError] = useState('')
  const [uiVisible, setUiVisible] = useState(false)
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    listBooks().then(setBooks).catch((loadError) => setError((loadError as Error).message))
  }, [])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === pageRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    const failure = searchParams.get('auth_error')
    if (!failure) return
    setFullscreenError(failure === 'access_denied' ? '登录已取消，可继续阅读。' : failure === 'account_not_allowed' ? '此账号暂未开通登录权限。' : '登录未完成，请稍后重试。')
    const next = new URLSearchParams(searchParams)
    next.delete('auth_error')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const book = useMemo(() => books?.find((item) => item.id === Number(id)), [books, id])
  const readableFiles = useMemo(() => book?.files.filter(isReadable) ?? [], [book])
  const requestedFileId = Number(searchParams.get('file'))
  const file = readableFiles.find((item) => item.id === requestedFileId) ?? readableFiles[0]

  const changeFile = (fileId: number) => setSearchParams({ file: String(fileId) }, { replace: true })
  const changeTheme = (next: ReaderTheme) => {
    setTheme(next)
    writePreference('book-reader-theme', next)
  }
  const changeFontSize = (next: number) => {
    setFontSize(next)
    writePreference('book-reader-font-size', String(next))
  }
  const changeFlow = (next: ReaderFlow) => {
    setFlow(next)
    writePreference('book-reader-flow', next)
  }
  const toggleFullscreen = async () => {
    setFullscreenError('')
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (pageRef.current?.requestFullscreen) await pageRef.current.requestFullscreen()
      else setFullscreenError('当前浏览器不支持全屏，可继续正常阅读。')
    } catch { setFullscreenError('浏览器未允许全屏，可继续正常阅读。') }
  }
  const toggleUi = useCallback(() => setUiVisible((current) => !current), [])
  const syncUiWithTopHover = useCallback((hovered: boolean) => setUiVisible(hovered), [])

  if (!books && !error) return <div className="reader-route-state">Opening reader…</div>
  if (error) return <div className="reader-route-state"><strong>Could not load the bookshelf.</strong><span>{error}</span><Link to="/books">Back to Books</Link></div>
  if (!book) return <div className="reader-route-state"><strong>Book not found.</strong><Link to="/books">Back to Books</Link></div>
  if (!file) return <div className="reader-route-state"><strong>No readable PDF or EPUB is available.</strong><span>Upload a supported file and enable public access from the dashboard.</span><Link to="/books">Back to Books</Link></div>

  const format = file.format.toLowerCase()
  return (
    <main
      ref={pageRef}
      className={`book-reader-page reader-theme-${theme}${uiVisible ? '' : ' is-reader-ui-hidden'}`}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && isReaderHoverDevice(window)) syncUiWithTopHover(false)
      }}
    >
      <SEO title={`Read ${book.title}`} description={`Read ${book.title} by ${book.author || 'Unknown author'}.`} path={`/books/${book.id}/read`} />
      {fullscreenError && <button type="button" className="reader-toast" onClick={() => setFullscreenError('')} role="status">{fullscreenError}</button>}
      <ReaderWorkspace key={file.id} bookId={book.id} file={file}>
        <header className="reader-toolbar" aria-label="阅读工具栏">
          <button className="reader-back" type="button" aria-label="返回书架" onClick={() => navigate('/books')}><img src="https://avatars.githubusercontent.com/u/144898416" alt="" width={28} height={28} draggable={false} /></button>
          <div className="book-reader-title"><strong>{book.title}</strong>{book.author && <span>{book.author}</span>}</div>
          <div ref={setToolbarHost} className="reader-toolbar-navigation" />
          <ReaderPreferences format={format} flow={flow} fontSize={fontSize} fullscreen={fullscreen} theme={theme} visible={uiVisible} onFlow={changeFlow} onFontSize={changeFontSize} onTheme={changeTheme} onFullscreen={toggleFullscreen} files={readableFiles} fileId={file.id} onFile={changeFile} />
        </header>
        <div className="book-reader-surface">
          {format === 'epub'
            ? <EpubReader toolbarHost={toolbarHost} title={book.title} cover={imageUrl(book.cover_url ?? undefined)} bookId={book.id} file={file} flow={flow} fontSize={fontSize} theme={theme} onTopHoverChange={syncUiWithTopHover} onToggleUi={toggleUi} />
            : <PdfReader toolbarHost={toolbarHost} title={book.title} cover={imageUrl(book.cover_url ?? undefined)} bookId={book.id} file={file} onTopHoverChange={syncUiWithTopHover} onToggleUi={toggleUi} />}
        </div>
      </ReaderWorkspace>
    </main>
  )
}
