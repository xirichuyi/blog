import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, List, Loader2, X } from 'lucide-react'
import type { Book as EpubBook, Location, NavItem, Rendition } from 'epubjs'
import { Button } from '@/components/ui/button'
import { loadReaderProgress, saveReaderProgress } from '@/lib/book-progress'
import { imageUrl, type BookFile } from '@/services/api'

export type ReaderTheme = 'paper' | 'night'

interface EpubReaderProps {
  bookId: number
  file: BookFile
  fontSize: number
  theme: ReaderTheme
}

interface ReadingLocation {
  atEnd: boolean
  atStart: boolean
  chapter: string
  percent: number
}

const EMPTY_LOCATION: ReadingLocation = {
  atEnd: false,
  atStart: true,
  chapter: 'Opening book…',
  percent: 0,
}

function flattenNavigation(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...flattenNavigation(item.subitems ?? [])])
}

function chapterForHref(items: NavItem[], href: string): string {
  const target = href.split('#')[0]
  return flattenNavigation(items).find((item) => item.href.split('#')[0] === target)?.label || 'Current chapter'
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
    body: { background: '#f8f7f2', color: '#252925', 'font-family': 'Georgia, "Noto Serif SC", serif', padding: '0 4%' },
    p: { 'line-height': '1.85' },
    a: { color: '#526a5e' },
  })
  rendition.themes.register('night', {
    body: { background: '#151815', color: '#e5e8e5', 'font-family': 'Georgia, "Noto Serif SC", serif', padding: '0 4%' },
    p: { 'line-height': '1.85' },
    a: { color: '#a8c0b3' },
  })
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

export function EpubReader({ bookId, file, fontSize, theme }: EpubReaderProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<EpubBook | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const navigationRef = useRef<NavItem[]>([])
  const [navigation, setNavigation] = useState<NavItem[]>([])
  const [location, setLocation] = useState<ReadingLocation>(EMPTY_LOCATION)
  const [tocOpen, setTocOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    let activeBook: EpubBook | null = null
    const openBook = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(imageUrl(file.file_url) || file.file_url)
        if (!response.ok) throw new Error(`The book file returned ${response.status}.`)
        const { default: createEpub } = await import('epubjs')
        if (disposed || !viewportRef.current) return
        activeBook = createEpub(await response.arrayBuffer())
        bookRef.current = activeBook
        const rendition = activeBook.renderTo(viewportRef.current, {
          width: '100%', height: '100%', spread: 'none', flow: 'paginated', allowScriptedContent: false,
        })
        renditionRef.current = rendition
        registerThemes(rendition)
        rendition.themes.select(theme)
        rendition.themes.fontSize(`${fontSize}%`)
        const nav = (await activeBook.loaded.navigation).toc
        navigationRef.current = nav
        setNavigation(nav)
        rendition.on('relocated', (nextLocation: Location) => {
          if (!activeBook || disposed) return
          const percent = progressFromLocation(activeBook, nextLocation)
          setLocation({
            atEnd: nextLocation.atEnd,
            atStart: nextLocation.atStart,
            chapter: chapterForHref(navigationRef.current, nextLocation.start.href),
            percent,
          })
          saveReaderProgress(bookId, file.id, { kind: 'epub', cfi: nextLocation.start.cfi, percent })
        })
        const saved = loadReaderProgress(bookId, file.id)
        await rendition.display(saved?.kind === 'epub' ? saved.cfi : undefined).catch(() => rendition.display())
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
      bookRef.current = null
      activeBook?.destroy()
    }
  }, [bookId, file.id, file.file_url])

  useEffect(() => {
    renditionRef.current?.themes.select(theme)
  }, [theme])

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSize}%`)
  }, [fontSize])

  useEffect(() => {
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, select, textarea, button')) return
      if (event.key === 'ArrowLeft') void renditionRef.current?.prev()
      if (event.key === 'ArrowRight') void renditionRef.current?.next()
    }
    window.addEventListener('keydown', navigateWithKeyboard)
    return () => window.removeEventListener('keydown', navigateWithKeyboard)
  }, [])

  const displayChapter = (href: string) => {
    void renditionRef.current?.display(href)
    setTocOpen(false)
  }

  return (
    <div className="epub-reader">
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
      <footer className="reader-controls">
        <Button size="icon" variant="ghost" onClick={() => setTocOpen(true)} aria-label="Open table of contents"><List /></Button>
        <Button size="icon" variant="ghost" disabled={location.atStart} onClick={() => void renditionRef.current?.prev()} aria-label="Previous page"><ChevronLeft /></Button>
        <div className="reader-location"><span>{location.chapter}</span><div><i style={{ width: `${location.percent}%` }} /></div><small>{location.percent}%</small></div>
        <Button size="icon" variant="ghost" disabled={location.atEnd} onClick={() => void renditionRef.current?.next()} aria-label="Next page"><ChevronRight /></Button>
      </footer>
    </div>
  )
}
