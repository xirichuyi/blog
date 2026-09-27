import { createPortal } from 'react-dom'
import { groupNoteMarkers, visibleRangeRects, noteMarkerPoint, type NoteMarker } from '@/lib/reader-annotations'
import type { TextLayer } from 'pdfjs-dist'
import { ReaderLoading } from './ReaderLoading'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, ZoomIn, List, X } from 'lucide-react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist/types/src/display/api'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Button } from '@/components/ui/button'
import { ParagraphNotes, useReaderWorkspace } from './ReaderWorkspace'
import { bindReaderSelection } from '@/lib/reader-selection'
import { bindReaderGestures, bindReaderKeyboard } from '@/lib/reader-gestures'
import { bookFileContentUrl, type BookFile } from '@/services/api'

interface PdfReaderProps {
  toolbarHost: HTMLElement | null
  title: string
  cover?: string
  bookId: number
  file: BookFile
  onTopHoverChange: (hovered: boolean) => void
  onToggleUi: () => void
}

type PdfOutline = NonNullable<Awaited<ReturnType<PDFDocumentProxy['getOutline']>>>
function Outline({ items, active, onSelect }: { items: PdfOutline; active: PdfOutline[number] | null; onSelect: (item: PdfOutline[number]) => void }) {
  return <ol>{items.map((item, index) => <li key={index}>
    <button type="button" aria-current={item === active ? 'location' : undefined} disabled={!item.dest} onClick={() => onSelect(item)}>{item.title}</button>
    {!!item.items?.length && <Outline items={item.items} active={active} onSelect={onSelect} />}
  </li>)}</ol>
}

export function PdfReader({ toolbarHost, title, cover, bookId, file, onTopHoverChange, onToggleUi }: PdfReaderProps) {
  const { session, snapshot, setSelection } = useReaderWorkspace()
  const restoredPage = () => { const saved = session.getProgress(); return saved?.kind === 'pdf' ? saved.page : 1 }
  const [outline, setOutline] = useState<PdfOutline>([])
  const [tocOpen, setTocOpen] = useState(false)
  const tocRef = useRef<HTMLElement>(null)
  const selectionRef = useRef<ReturnType<typeof bindReaderSelection> | null>(null)
  const [outlinePages, setOutlinePages] = useState<{ item: PdfOutline[number]; page: number }[]>([])
  const [navigationError, setNavigationError] = useState('')
  const pageRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [markers, setMarkers] = useState<NoteMarker[]>([])
  const [renderVersion, setRenderVersion] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(() => restoredPage())
  const [pages, setPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [frameWidth, setFrameWidth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let disposed = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const pdfjs = await import('pdfjs-dist')
        if (disposed) return
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
        loadingTask = pdfjs.getDocument({ url: bookFileContentUrl(file) })
        const loaded = await loadingTask.promise
        if (disposed) return void loaded.destroy()
        const initialPage = Math.min(loaded.numPages, Math.max(1, restoredPage()))
        setDocument(loaded)
        setPages(loaded.numPages)
        setPage(initialPage)
        void loaded.getOutline().then(items => { if (!disposed) setOutline(items ?? []) }).catch(() => { if (!disposed) setOutline([]) })
      } catch (loadError) {
        if (!disposed) {
          setError((loadError as Error).message || 'The PDF could not be opened.')
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      disposed = true
      setDocument(null)
      void loadingTask?.destroy()
    }
  }, [bookId, file.id, file.file_url, retry, session])

  useEffect(() => {
    if (!frameRef.current) return
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width))
    observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!document || !canvasRef.current || !frameWidth) return
    let renderTask: RenderTask | null = null
    let textLayer: TextLayer | null = null
    setSelection(null)
    let cancelled = false
    const render = async () => {
      const pdfPage = await document.getPage(page)
      if (cancelled || !canvasRef.current) return
      const natural = pdfPage.getViewport({ scale: 1 })
      const fitScale = Math.min(1.7, Math.max(0.35, (frameWidth - 40) / natural.width))
      const viewport = pdfPage.getViewport({ scale: fitScale * zoom })
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas is not available.')
      canvas.width = Math.floor(viewport.width * pixelRatio)
      canvas.height = Math.floor(viewport.height * pixelRatio)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      if (pageRef.current) {
        pageRef.current.style.width = `${viewport.width}px`
        pageRef.current.style.height = `${viewport.height}px`
      }
      renderTask = pdfPage.render({ canvas, canvasContext: context, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] })
      await renderTask.promise
      if (cancelled || !textRef.current) return
      textRef.current.replaceChildren()
      textRef.current.style.setProperty('--total-scale-factor', String(viewport.scale))
      const pdfjs = await import('pdfjs-dist')
      if (cancelled) return
      textLayer = new pdfjs.TextLayer({ textContentSource: pdfPage.streamTextContent(), container: textRef.current, viewport })
      await textLayer.render()
      if (!cancelled) { setLoading(false); setRenderVersion(value => value + 1) }
    }
    void render().catch((renderError) => {
      if (!cancelled && (renderError as Error).name !== 'RenderingCancelledException') { setError((renderError as Error).message); setLoading(false) }
    })
    return () => {
      cancelled = true
      renderTask?.cancel()
      textLayer?.cancel()
    }
  }, [document, frameWidth, page, zoom, setSelection])

  useEffect(() => {
    if (pages) session.saveProgress({ kind: 'pdf', page, pages })
  }, [session, page, pages])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    return bindReaderGestures(frame, {
      getWindow: () => window,
      pageNavigation: zoom <= 1,
      toLocalPoint: (x, y) => { const rect = frame.getBoundingClientRect(); return { x: x - rect.left, y: y - rect.top } },
      getHeight: () => frame.clientHeight,
      getSelection: () => selectionRef.current?.text() || window.getSelection()?.toString() || '',
      getWidth: () => frame.clientWidth,
      onNext: () => setPage((current) => Math.min(pages || 1, current + 1)),
      onPrevious: () => setPage((current) => Math.max(1, current - 1)),
      onTopHoverChange,
      onToggleControls: onToggleUi,
    })
  }, [onToggleUi, onTopHoverChange, pages, zoom])

  useEffect(() => bindReaderKeyboard(window, {
    getSelection: () => selectionRef.current?.text() || window.getSelection()?.toString() || '',
    onNext: () => setPage((current) => Math.min(pages || 1, current + 1)),
    onPrevious: () => setPage((current) => Math.max(1, current - 1)),
  }), [pages])

  useEffect(() => {
    const root = textRef.current
    if (!root) return
    const selection = bindReaderSelection(root, value => {
      if (!value) { setSelection(null); return }
      const range = value.range
      const pageBounds = pageRef.current?.getBoundingClientRect()
      const bounds = frameRef.current?.getBoundingClientRect()
      if (!pageBounds || !bounds) return
      const visible = visibleRangeRects(range, bounds)
      const anchor = visible.at(-1)
      if (!anchor) { setSelection(null); return }
      const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).slice(0, 100).map(rect => {
        const x = Math.max(0, Math.min(1, (rect.left - pageBounds.left) / pageBounds.width))
        const y = Math.max(0, Math.min(1, (rect.top - pageBounds.top) / pageBounds.height))
        return { x, y, width: Math.min(1 - x, rect.width / pageBounds.width), height: Math.min(1 - y, rect.height / pageBounds.height) }
      }).filter(rect => rect.width > 0 && rect.height > 0)
      if (rects.length) setSelection({ position: { kind: 'pdf', page, pages }, quote: range.toString().trim(), anchor, rects, ...(value.custom ? { touch: { rects: visible, adjust: value.adjust } } : {}) })
    })
    selectionRef.current = selection
    return () => { selection.dispose(); selectionRef.current = null }
  }, [page, pages, setSelection])

  useEffect(() => {
    if (!document) return
    let disposed = false
    const flatten = (items: PdfOutline): PdfOutline => items.flatMap(item => [item, ...flatten(item.items)])
    void Promise.all(flatten(outline).map(async item => {
      try {
        const dest = typeof item.dest === 'string' ? await document.getDestination(item.dest) : item.dest
        if (!dest) return null
        const index = typeof dest[0] === 'number' ? dest[0] : await document.getPageIndex(dest[0])
        return { item, page: index + 1 }
      } catch { return null }
    })).then(items => { if (!disposed) setOutlinePages(items.filter((item): item is { item: PdfOutline[number]; page: number } => item !== null).sort((a, b) => a.page - b.page)) })
    return () => { disposed = true }
  }, [document, outline])
  const activeChapter = useMemo(() => {
    // Sorted once when the outline loads; upper-bound search preserves the last
    // matching subchapter when several entries point at the same page.
    let low = 0
    let high = outlinePages.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (outlinePages[middle].page <= page) low = middle + 1
      else high = middle
    }
    return outlinePages[low - 1]?.item ?? null
  }, [outlinePages, page])
  const pageNotes = useMemo(() => snapshot.data.entries.filter(entry => entry.note && entry.position.kind === 'pdf' && entry.position.page === page), [snapshot.data.entries, page])
  useEffect(() => {
    if (!tocOpen) return
    const current = tocRef.current?.querySelector<HTMLElement>('[aria-current="location"]')
    current?.scrollIntoView({ block: 'center' })
    current?.focus({ preventScroll: true })
  }, [tocOpen, activeChapter])

  useEffect(() => {
    const frame = frameRef.current
    const sheet = pageRef.current
    if (!frame || !sheet) return
    let scheduled = 0
    const update = () => {
      scheduled = 0
      selectionRef.current?.refresh()
      // Most pages have no notes: avoid geometry reads and state updates entirely.
      if (!pageNotes.length) {
        setMarkers(previous => previous.length ? [] : previous)
        return
      }
      const bounds = frame.getBoundingClientRect()
      const rect = sheet.getBoundingClientRect()
      const points: { id: string; x: number; y: number }[] = []
      for (const entry of pageNotes) {
        const last = entry.rects?.at(-1)
        if (!last) continue
        const anchor = { left: rect.left + last.x * rect.width, right: rect.left + (last.x + last.width) * rect.width, top: rect.top + last.y * rect.height, bottom: rect.top + (last.y + last.height) * rect.height }
        if (anchor.bottom > bounds.top && anchor.top < bounds.bottom && anchor.right > bounds.left && anchor.left < bounds.right) points.push({ id: entry.id, ...noteMarkerPoint(anchor, bounds) })
      }
      const next = groupNoteMarkers(points)
      setMarkers(previous => previous.length === next.length && previous.every((marker, index) => {
        const other = next[index]
        return marker.x === other.x && marker.y === other.y && marker.ids.length === other.ids.length && marker.ids.every((id, i) => id === other.ids[i])
      }) ? previous : next)
    }
    const scroll = () => { if (!scheduled) scheduled = requestAnimationFrame(update) }
    frame.addEventListener('scroll', scroll, { passive: true })
    const observer = new ResizeObserver(scroll)
    observer.observe(sheet)
    update()
    return () => { cancelAnimationFrame(scheduled); frame.removeEventListener('scroll', scroll); observer.disconnect() }
  }, [pageNotes, renderVersion])

  const displayChapter = async (item: PdfOutline[number]) => {
    if (!document || !item.dest) return
    try {
      const destination = typeof item.dest === 'string' ? await document.getDestination(item.dest) : item.dest
      if (!destination) throw new Error('Missing destination')
      const index = typeof destination[0] === 'number' ? destination[0] : await document.getPageIndex(destination[0])
      setPage(Math.max(1, Math.min(pages, index + 1)))
      setTocOpen(false)
      setNavigationError('')
    } catch { setNavigationError('无法打开此目录项。') }
  }

  return (
    <div className="pdf-reader">
      {tocOpen && <>
        <aside ref={tocRef} className="reader-toc is-open" aria-label="PDF 目录">
          <div className="reader-toc-heading"><span>目录</span><Button size="icon" variant="ghost" aria-label="关闭目录" onClick={() => setTocOpen(false)}><X /></Button></div>
          {outline.length ? <Outline items={outline} active={activeChapter} onSelect={item => void displayChapter(item)} /> : <p>此 PDF 没有内嵌目录，可使用页码跳转。</p>}
        </aside>
        <button className="reader-toc-scrim" type="button" aria-label="关闭目录遮罩" onClick={() => setTocOpen(false)} />
      </>}
      <section ref={frameRef} style={{ touchAction: zoom > 1 ? 'pan-x pan-y pinch-zoom' : 'pan-y pinch-zoom' }} className="pdf-viewport" tabIndex={0} aria-label="PDF reading area">
        <div ref={pageRef} className="pdf-page">
          <canvas ref={canvasRef} />
          <div ref={textRef} className="textLayer" />
          {pageNotes.flatMap(entry => (entry.rects ?? []).map((rect, index) => <span key={`${entry.id}-${index}`} className="pdf-note-underline" style={{ left: `${rect.x * 100}%`, top: `${(rect.y + rect.height) * 100}%`, width: `${rect.width * 100}%` }} />))}
        </div>
        {loading && <ReaderLoading title={title} cover={cover} message="正在打开 PDF…" />}
        {error && <div className="reader-state reader-error"><strong>Could not open this PDF</strong><span>{error}</span><Button variant="outline" onClick={() => setRetry(value => value + 1)}>重试</Button></div>}
      </section>
      <ParagraphNotes markers={markers} />
      {toolbarHost && createPortal(<div className="reader-chapter-controls reader-pdf-controls" aria-label="Page navigation">
        <Button size="icon" variant="ghost" aria-label="Open table of contents" onClick={() => setTocOpen(true)}><List /></Button>
        <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page"><ChevronLeft /></Button>
        <div className="pdf-page-control"><input aria-label="Current page" type="number" min={1} max={pages || 1} value={page} onChange={(event) => setPage(Math.min(pages || 1, Math.max(1, Number(event.target.value))))} /><span>/ {pages || '—'}</span></div>
        <Button size="icon" variant="ghost" disabled={!pages || page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} aria-label="Next page"><ChevronRight /></Button>
        <details className="reader-zoom"><summary className="reader-zoom-trigger" aria-label="缩放"><ZoomIn /></summary><div className="reader-zoom-menu">
        <Button size="icon" variant="ghost" disabled={zoom <= 0.7} onClick={() => setZoom((current) => Math.max(0.7, current - 0.1))} aria-label="Zoom out"><Minus /></Button>
        <small>{Math.round(zoom * 100)}%</small>
        <Button size="icon" variant="ghost" disabled={zoom >= 1.8} onClick={() => setZoom((current) => Math.min(1.8, current + 0.1))} aria-label="Zoom in"><Plus /></Button></div></details>
      </div>, toolbarHost)}
      {navigationError && <button type="button" className="reader-navigation-error" onClick={() => setNavigationError('')}>{navigationError}</button>}
    </div>
  )
}
