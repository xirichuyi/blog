import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, List, Loader2, X } from 'lucide-react'
import type { Book as EpubBook, Contents, Location, NavItem, Rendition } from 'epubjs'
import { Button } from '@/components/ui/button'
import { loadReaderProgress, saveReaderProgress } from '@/lib/book-progress'
import { bindReaderGestures, bindReaderKeyboard } from '@/lib/reader-gestures'
import { bookFileContentUrl, type BookFile } from '@/services/api'

export type ReaderTheme = 'paper' | 'night'
export type ReaderFlow = 'paginated' | 'scrolled'

interface EpubReaderProps {
  bookId: number
  file: BookFile
  flow: ReaderFlow
  fontSize: number
  onTopHoverChange: (hovered: boolean) => void
  onToggleUi: () => void
  theme: ReaderTheme
}

interface ReadingPosition {
  atEnd: boolean
  atStart: boolean
}

const EMPTY_POSITION: ReadingPosition = {
  atEnd: false,
  atStart: true,
}

function progressFromLocation(book: EpubBook, location: Location): number {
  const cfi = location.start.cfi
  const generated = book.locations.length() > 0
    ? book.locations.percentageFromCfi(cfi)
    : location.start.percentage
  return Number.isFinite(generated) ? Math.round(Math.min(1, Math.max(0, generated)) * 100) : 0
}

function registerThemes(rendition: Rendition): void {
  rendition.themes.register('paper', {
    html: { background: '#fbfaf6', color: '#252925' },
    body: { background: '#fbfaf6', color: '#252925', 'font-family': 'Georgia, "Noto Serif SC", serif', padding: '0 4%' },
    p: { 'line-height': '1.85' },
    a: { color: '#526a5e' },
  })
  rendition.themes.register('night', {
    html: { background: '#191c19', color: '#e5e8e5' },
    body: { background: '#191c19', color: '#e5e8e5', 'font-family': 'Georgia, "Noto Serif SC", serif', padding: '0 4%' },
    p: { 'line-height': '1.85' },
    a: { color: '#a8c0b3' },
  })
}

function applyContentAppearance(contents: Contents, theme: ReaderTheme): void {
  const paper = theme === 'night' ? '#191c19' : '#fbfaf6'
  const ink = theme === 'night' ? '#e5e8e5' : '#252925'
  const root = contents.document.documentElement as HTMLElement
  root.style.setProperty('background-color', paper, 'important')
  root.style.setProperty('color-scheme', theme === 'night' ? 'dark' : 'light')
  contents.document.body?.style.setProperty('background-color', paper, 'important')
  contents.document.body?.style.setProperty('color', ink, 'important')
  root.style.touchAction = 'pan-y pinch-zoom'
  if (contents.document.body) contents.document.body.style.touchAction = root.style.touchAction
}

function visibleContents(rendition: Rendition): Contents[] {
  // EPUB.js returns an array at runtime, although its bundled declaration says Contents.
  return rendition.getContents() as unknown as Contents[]
}

function applyRenditionAppearance(rendition: Rendition, theme: ReaderTheme, fontSize: number): void {
  rendition.themes.select(theme)
  rendition.themes.fontSize(`${fontSize}%`)
  visibleContents(rendition).forEach((contents) => applyContentAppearance(contents, theme))
}

function TableOfContents({ items, onSelect }: { items: NavItem[]; onSelect: (href: string) => void }) {
  return (
    <ol>
      {items.map((item) => (
        <li key={`${item.id}-${item.href}`}>
          <button type="button" onClick={() => onSelect(item.href)}>{item.label.trim()}</button>
          {!!item.subitems?.length && <TableOfContents items={item.subitems} onSelect={onSelect} />}
        </li>
      ))}
    </ol>
  )
}

export function EpubReader({ bookId, file, flow, fontSize, onTopHoverChange, onToggleUi, theme }: EpubReaderProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const fontSizeRef = useRef(fontSize)
  const themeRef = useRef(theme)
  fontSizeRef.current = fontSize
  themeRef.current = theme
  const [navigation, setNavigation] = useState<NavItem[]>([])
  const [position, setPosition] = useState<ReadingPosition>(EMPTY_POSITION)
  const [tocOpen, setTocOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    let activeBook: EpubBook | null = null
    const interactionCleanups = new Map<Contents, () => void>()
    const openBook = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(bookFileContentUrl(bookId, file.id))
        if (!response.ok) throw new Error(`The book file returned ${response.status}.`)
        const { default: createEpub } = await import('epubjs')
        if (disposed || !viewportRef.current) return
        activeBook = createEpub(await response.arrayBuffer())
        const rendition = activeBook.renderTo(viewportRef.current, {
          width: '100%',
          height: '100%',
          manager: flow === 'scrolled' ? 'continuous' : 'default',
          spread: flow === 'scrolled' ? 'none' : 'auto',
          flow: flow === 'scrolled' ? 'scrolled-doc' : 'paginated',
          minSpreadWidth: 1100,
          allowScriptedContent: false,
        })
        renditionRef.current = rendition
        registerThemes(rendition)
        applyRenditionAppearance(rendition, themeRef.current, fontSizeRef.current)
        const unbindRemovedView = (view: { contents?: Contents }) => {
          const contents = view.contents
          if (!contents) return
          interactionCleanups.get(contents)?.()
          interactionCleanups.delete(contents)
        }
        rendition.hooks.unloaded.register(unbindRemovedView)
        const bindVisibleContents = () => {
          visibleContents(rendition).forEach((contents) => {
            applyContentAppearance(contents, themeRef.current)
            if (interactionCleanups.has(contents)) return
            const cleanup = bindReaderGestures(contents.document, {
              getWindow: () => contents.window,
              pageNavigation: true,
              getHeight: () => contents.window.innerHeight,
              getSelection: () => contents.window.getSelection()?.toString() ?? '',
              getWidth: () => contents.window.innerWidth,
              onNext: () => void rendition.next(),
              onPrevious: () => void rendition.prev(),
              onTopHoverChange,
              onToggleControls: onToggleUi,
            })
            const cleanupKeyboard = bindReaderKeyboard(contents.document, {
              pageNavigation: flow === 'paginated',
              getSelection: () => contents.window.getSelection()?.toString() ?? '',
              onNext: () => void rendition.next(),
              onPrevious: () => void rendition.prev(),
            })
            interactionCleanups.set(contents, () => {
              cleanup()
              cleanupKeyboard()
            })
          })
        }
        rendition.on('rendered', bindVisibleContents)
        const nav = (await activeBook.loaded.navigation).toc
        setNavigation(nav)
        rendition.on('relocated', (nextLocation: Location) => {
          if (!activeBook || disposed) return
          const percent = progressFromLocation(activeBook, nextLocation)
          setPosition({
            atEnd: nextLocation.atEnd,
            atStart: nextLocation.atStart,
          })
          saveReaderProgress(bookId, file.id, { kind: 'epub', cfi: nextLocation.start.cfi, percent })
        })
        const saved = loadReaderProgress(bookId, file.id)
        await rendition.display(saved?.kind === 'epub' ? saved.cfi : undefined).catch(() => rendition.display())
        bindVisibleContents()
        setLoading(false)
        void activeBook.locations.generate(1600).then(() => rendition.reportLocation()).catch(() => undefined)
      } catch (openError) {
        if (!disposed) {
          setError((openError as Error).message || 'The EPUB could not be opened.')
          setLoading(false)
        }
      }
    }
    void openBook()
    return () => {
      disposed = true
      renditionRef.current = null
      interactionCleanups.forEach((cleanup) => cleanup())
      interactionCleanups.clear()
      activeBook?.destroy()
    }
  }, [bookId, file.id, file.file_url, flow, onTopHoverChange, onToggleUi])

  useEffect(() => {
    themeRef.current = theme
    const rendition = renditionRef.current
    if (rendition) applyRenditionAppearance(rendition, theme, fontSizeRef.current)
  }, [theme])

  useEffect(() => {
    fontSizeRef.current = fontSize
    const rendition = renditionRef.current
    if (rendition) applyRenditionAppearance(rendition, themeRef.current, fontSize)
  }, [fontSize])

  useEffect(() => bindReaderKeyboard(window, {
    pageNavigation: flow === 'paginated',
    getSelection: () => window.getSelection()?.toString() ?? '',
    onNext: () => void renditionRef.current?.next(),
    onPrevious: () => void renditionRef.current?.prev(),
  }), [flow])

  const displayChapter = (href: string) => {
    void renditionRef.current?.display(href)
    setTocOpen(false)
  }

  return (
    <div className={`epub-reader reader-flow-${flow}`}>
      <aside className={tocOpen ? 'reader-toc is-open' : 'reader-toc'} aria-label="Table of contents">
        <div className="reader-toc-heading"><span>Contents</span><Button size="icon" variant="ghost" onClick={() => setTocOpen(false)}><X /></Button></div>
        {navigation.length ? <TableOfContents items={navigation} onSelect={displayChapter} /> : <p>No table of contents.</p>}
      </aside>
      {tocOpen && <button className="reader-toc-scrim" type="button" aria-label="Close table of contents" onClick={() => setTocOpen(false)} />}
      <section className="reader-canvas-wrap">
        <div ref={viewportRef} className="epub-viewport" />
        {loading && <div className="reader-state"><Loader2 className="animate-spin" /> Preparing EPUB…</div>}
        {error && <div className="reader-state reader-error"><strong>Could not open this EPUB</strong><span>{error}</span></div>}
      </section>
      <div className="reader-chapter-controls" aria-label="Chapter navigation">
        <Button size="icon" variant="ghost" onClick={() => setTocOpen(true)} aria-label="Open table of contents"><List /></Button>
        <Button size="icon" variant="ghost" disabled={position.atStart} onClick={() => void renditionRef.current?.prev()} aria-label="Previous page"><ChevronLeft /></Button>
        <Button size="icon" variant="ghost" disabled={position.atEnd} onClick={() => void renditionRef.current?.next()} aria-label="Next page"><ChevronRight /></Button>
      </div>
    </div>
  )
}
