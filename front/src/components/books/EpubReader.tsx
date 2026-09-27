import { createPortal } from 'react-dom'
import { groupNoteMarkers, visibleRangeAnchor, visibleRangeRects, noteMarkerPoint, type NoteMarker } from '@/lib/reader-annotations'
import { ReaderLoading } from './ReaderLoading'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, List, X } from 'lucide-react'
import type { Book as EpubBook, Contents, Location, NavItem, Rendition } from 'epubjs'
import type { RenditionOptions } from 'epubjs/types/rendition'
import { Button } from '@/components/ui/button'
import { ParagraphNotes, useReaderWorkspace } from './ReaderWorkspace'
import { prepareEpubContent } from '@/lib/epub-content'
import { bindReaderSelection, clearReaderSelection } from '@/lib/reader-selection'
import { bindReaderGestures, bindReaderKeyboard } from '@/lib/reader-gestures'
import { bookFileContentUrl, type BookFile } from '@/services/api'

export type ReaderTheme = 'paper' | 'night'
export type ReaderFlow = 'paginated' | 'scrolled'

interface EpubReaderProps {
  toolbarHost: HTMLElement | null
  title: string
  cover?: string
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
    body: { background: '#fbfaf6', color: '#252925', 'font-family': 'Georgia, "Noto Serif SC", serif', padding: '0 6%' },
    p: { 'line-height': '1.85' },
    a: { color: '#526a5e' },
  })
  rendition.themes.register('night', {
    html: { background: '#191c19', color: '#e5e8e5' },
    body: { background: '#191c19', color: '#e5e8e5', 'font-family': 'Georgia, "Noto Serif SC", serif', padding: '0 6%' },
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

function TableOfContents({ items, active, onSelect }: { items: NavItem[]; active: string; onSelect: (href: string) => void }) {
  return (
    <ol>
      {items.map((item) => (
        <li key={`${item.id}-${item.href}`}>
          <button type="button" aria-current={item.href === active ? 'location' : undefined} onClick={() => onSelect(item.href)}>{item.label.trim()}</button>
          {!!item.subitems?.length && <TableOfContents items={item.subitems} active={active} onSelect={onSelect} />}
        </li>
      ))}
    </ol>
  )
}

export function EpubReader({ toolbarHost, title, cover, bookId, file, flow, fontSize, onTopHoverChange, onToggleUi, theme }: EpubReaderProps) {
  const { session, snapshot, setSelection } = useReaderWorkspace()
  const [markers, setMarkers] = useState<NoteMarker[]>([])
  const bookRef = useRef<EpubBook | null>(null)
  const [activeChapter, setActiveChapter] = useState('')
  const tocRef = useRef<HTMLElement>(null)
  const selections = useRef(new Map<Contents, ReturnType<typeof bindReaderSelection>>())
  const [navigationError, setNavigationError] = useState('')
  const [renderVersion, setRenderVersion] = useState(0)
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
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!tocOpen) return
    const current = tocRef.current?.querySelector<HTMLElement>('[aria-current="location"]')
    current?.scrollIntoView({ block: 'center' })
    current?.focus({ preventScroll: true })
  }, [tocOpen, activeChapter])
  const [phase, setPhase] = useState('正在下载 EPUB…')
  const fileCache = useRef<{ url: string; bytes: ArrayBuffer } | null>(null)

  useEffect(() => {
    let disposed = false
    const controller = new AbortController()
    let activeBook: EpubBook | null = null
    const interactionCleanups = new Map<Contents, () => void>()
    const openBook = async () => {
      setLoading(true)
      setError('')
      try {
        const url = bookFileContentUrl(file)
        let bytes = fileCache.current?.url === url ? fileCache.current.bytes : undefined
        if (!bytes) {
          fileCache.current = null
          setPhase('正在下载 EPUB…')
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) throw new Error(`The book file returned ${response.status}.`)
          bytes = await response.arrayBuffer()
          if (disposed) return
          fileCache.current = { url, bytes }
        }
        setPhase('正在排版，即将打开…')
        const { default: createEpub } = await import('epubjs')
        if (disposed || !viewportRef.current) return
        activeBook = createEpub(bytes.slice(0))
        // Wait until EPUB.js has registered its resource replacement hook, then
        // sanitize its final output before any iframe is allowed to load it.
        await activeBook.opened
        if (disposed) return
        activeBook.spine.hooks.serialize.register((_output: string, section: { output: string; url: string }) => {
          section.output = prepareEpubContent(section.output, section.url)
        })
        bookRef.current = activeBook
        // EPUB.js forwards gap to its layout manager, but omits it from its types.
        const options: RenditionOptions & { gap: number } = {
          width: '100%',
          height: '100%',
          manager: flow === 'scrolled' ? 'continuous' : 'default',
          spread: flow === 'scrolled' ? 'none' : 'auto',
          flow: flow === 'scrolled' ? 'scrolled-doc' : 'paginated',
          minSpreadWidth: 1100,
          gap: 64, // Leave room for paragraph icons without covering text.
          // Only parent-owned reader listeners run; prepareEpubContent blocks book scripts.
          allowScriptedContent: true,
        }
        const rendition = activeBook.renderTo(viewportRef.current, options)
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
            const selection = bindReaderSelection(contents.document.body, value => {
              if (!value) { setSelection(null); return }
              const bounds = viewportRef.current?.getBoundingClientRect()
              const frame = contents.window.frameElement?.getBoundingClientRect()
              if (!bounds || !frame) return
              const rects = visibleRangeRects(value.range, bounds, { x: frame.left, y: frame.top })
              const anchor = rects.at(-1)
              if (!anchor) { setSelection(null); return }
              const progress = session.getProgress()
              setSelection({ position: { kind: 'epub', cfi: contents.cfiFromRange(value.range), percent: progress?.kind === 'epub' ? progress.percent : 0 }, quote: value.range.toString().trim(), anchor, ...(value.custom ? { touch: { rects, adjust: value.adjust } } : {}) })
            }, (x, y) => {
              const frame = contents.window.frameElement!.getBoundingClientRect()
              return { x: x - frame.left, y: y - frame.top }
            })
            selections.current.set(contents, selection)
            const cleanup = bindReaderGestures(contents.document, {
              getWindow: () => contents.window,
              pageNavigation: flow === 'paginated',
              getHeight: () => viewportRef.current?.clientHeight ?? window.innerHeight,
              getSelection: () => selection.text(),
              getWidth: () => viewportRef.current?.clientWidth ?? window.innerWidth,
              toLocalPoint: (x, y) => {
                const frame = contents.window.frameElement?.getBoundingClientRect()
                const viewport = viewportRef.current?.getBoundingClientRect()
                return { x: x + (frame?.left ?? 0) - (viewport?.left ?? 0), y: y + (frame?.top ?? 0) - (viewport?.top ?? 0) }
              },
              onNext: () => void rendition.next(),
              onPrevious: () => void rendition.prev(),
              onTopHoverChange,
              onToggleControls: onToggleUi,
            })
            const cleanupKeyboard = bindReaderKeyboard(contents.document, {
              pageNavigation: flow === 'paginated',
              getSelection: () => selection.text(),
              onNext: () => void rendition.next(),
              onPrevious: () => void rendition.prev(),
            })
            interactionCleanups.set(contents, () => {
              cleanup()
              cleanupKeyboard()
              selection.dispose()
              selections.current.delete(contents)
            })
          })
        }
        rendition.on('rendered', bindVisibleContents)
        const nav = (await activeBook.loaded.navigation).toc
        if (disposed) return
        setNavigation(nav)
        const flatten = (items: NavItem[]): NavItem[] => items.flatMap(item => [item, ...flatten(item.subitems ?? [])])
        const chapters = flatten(nav)
        rendition.on('relocated', (nextLocation: Location) => {
          if (!activeBook || disposed) return
          const percent = progressFromLocation(activeBook, nextLocation)
          setPosition({
            atEnd: nextLocation.atEnd,
            atStart: nextLocation.atStart,
          })
          const candidates = chapters.filter(item => activeBook?.spine.get(item.href.split('#')[0])?.index === nextLocation.start.index)
          let current = candidates[0]
          const contents = visibleContents(rendition).find(content => content.sectionIndex === nextLocation.start.index)
          if (contents) {
            try {
              const start = contents.range(nextLocation.start.cfi)
              for (const item of candidates) {
                const fragment = item.href.split('#')[1]
                const element = fragment ? contents.document.getElementById(decodeURIComponent(fragment)) : null
                if (element && start.comparePoint(element, 0) <= 0) current = item
              }
            } catch { /* Fall back to the chapter when a fragment is missing. */ }
          }
          setActiveChapter(current?.href ?? '')
          session.saveProgress({ kind: 'epub', cfi: nextLocation.start.cfi, percent })
        })
        const saved = session.getProgress()
        await rendition.display(saved?.kind === 'epub' ? saved.cfi : undefined).catch(() => rendition.display())
        if (disposed) return
        bindVisibleContents()
        setLoading(false)
        setRenderVersion(version => version + 1)
        void activeBook.locations.generate(1600).then(() => { if (!disposed) rendition.reportLocation() }).catch(() => undefined)
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
      controller.abort()
      renditionRef.current = null
      bookRef.current = null
      setSelection(null)
      interactionCleanups.forEach((cleanup) => cleanup())
      interactionCleanups.clear()
      activeBook?.destroy()
    }
  }, [bookId, file.id, file.file_url, flow, retry, onTopHoverChange, onToggleUi, session, setSelection])

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
    getSelection: () => Array.from(selections.current.values()).map(selection => selection.text()).join('') || window.getSelection()?.toString() || '',
    onNext: () => void renditionRef.current?.next(),
    onPrevious: () => void renditionRef.current?.prev(),
  }), [flow])

  useEffect(() => {
    const rendition = renditionRef.current
    if (!rendition || loading) return
    const added: string[] = []
    for (const entry of snapshot.data.entries) {
      if (!entry.note || !entry.quote || entry.position.kind !== 'epub') continue
      try {
        rendition.annotations.underline(entry.position.cfi, {}, undefined, 'reader-note-underline', { stroke: '#809588', 'stroke-opacity': '0.5', 'stroke-width': '1' })
        added.push(entry.position.cfi)
      } catch { /* An invalid location in a replaced file must not prevent reading. */ }
    }
    return () => { for (const cfi of added) { try { rendition.annotations.remove(cfi, 'underline') } catch { /* Rendition already destroyed. */ } } }
  }, [snapshot.data.entries, renderVersion, loading])

  useEffect(() => {
    const rendition = renditionRef.current
    const viewport = viewportRef.current
    if (!rendition || !viewport || loading) return
    let scheduled = 0
    const update = () => {
      cancelAnimationFrame(scheduled)
      scheduled = requestAnimationFrame(() => {
        const bounds = viewport.getBoundingClientRect()
        const points: { id: string; x: number; y: number }[] = []
        for (const contents of visibleContents(rendition)) {
          const frame = contents.window.frameElement?.getBoundingClientRect()
          if (!frame) continue
          for (const entry of snapshot.data.entries) {
            if (!entry.note || !entry.quote || entry.position.kind !== 'epub') continue
            try {
              const section = bookRef.current?.spine.get(entry.position.cfi)
              if (section?.index !== contents.sectionIndex) continue
              const anchor = visibleRangeAnchor(contents.range(entry.position.cfi), bounds, { x: frame.left, y: frame.top })
              if (anchor) points.push({ id: entry.id, ...noteMarkerPoint(anchor, bounds) })
            } catch { /* A removed chapter must not prevent reading. */ }
          }
        }
        setMarkers(groupNoteMarkers(points))
        selections.current.forEach(selection => selection.refresh())
      })
    }
    const scroll = update
    rendition.on('rendered', update)
    rendition.on('relocated', update)
    rendition.on('resized', update)
    viewport.addEventListener('scroll', scroll, true)
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    update()
    return () => {
      cancelAnimationFrame(scheduled)
      rendition.off('rendered', update)
      rendition.off('relocated', update)
      rendition.off('resized', update)
      viewport.removeEventListener('scroll', scroll, true)
      observer.disconnect()
    }
  }, [snapshot.data.entries, loading, renderVersion, fontSize, flow, setSelection, session])

  const displayChapter = (href: string) => {
    setNavigationError('')
    clearReaderSelection()
    setSelection(null)
    void renditionRef.current?.display(href).catch(() => setNavigationError('章节打开失败，请重试。'))
    setTocOpen(false)
  }


  return (
    <div className={`epub-reader reader-flow-${flow}`}>
      {tocOpen && <aside ref={tocRef} className={tocOpen ? 'reader-toc is-open' : 'reader-toc'} aria-label="Table of contents">
        <div className="reader-toc-heading"><span>目录</span><Button size="icon" variant="ghost" aria-label="关闭目录" onClick={() => setTocOpen(false)}><X /></Button></div>
        {navigation.length ? <TableOfContents items={navigation} active={activeChapter} onSelect={displayChapter} /> : <p>No table of contents.</p>}
      </aside>}
      {tocOpen && <button className="reader-toc-scrim" type="button" aria-label="Close table of contents" onClick={() => setTocOpen(false)} />}
      <section className="reader-canvas-wrap">
        <div ref={viewportRef} className="epub-viewport" />
        {loading && <ReaderLoading title={title} cover={cover} message={phase} />}
        {error && <div className="reader-state reader-error"><strong>Could not open this EPUB</strong><span>{error}</span><Button variant="outline" onClick={() => { fileCache.current = null; setRetry(value => value + 1) }}>重试</Button></div>}
      </section>
      <ParagraphNotes markers={markers} />
      {toolbarHost && createPortal(<div className="reader-chapter-controls" aria-label="Chapter navigation">
        <Button size="icon" variant="ghost" onClick={() => setTocOpen(true)} aria-label="Open table of contents"><List /></Button>
        <Button size="icon" variant="ghost" disabled={loading || Boolean(error) || position.atStart} onClick={() => { clearReaderSelection(); void renditionRef.current?.prev() }} aria-label="Previous page"><ChevronLeft /></Button>
        <Button size="icon" variant="ghost" disabled={loading || Boolean(error) || position.atEnd} onClick={() => { clearReaderSelection(); void renditionRef.current?.next() }} aria-label="Next page"><ChevronRight /></Button>
      </div>, toolbarHost)}
      {navigationError && <button type="button" className="reader-navigation-error" onClick={() => setNavigationError('')}>{navigationError}</button>}
    </div>
  )
}
