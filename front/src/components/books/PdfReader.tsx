import { ReaderLoading } from './ReaderLoading'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, List, X } from 'lucide-react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist/types/src/display/api'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Button } from '@/components/ui/button'
import { useReaderWorkspace } from './ReaderWorkspace'
import { bindReaderGestures, bindReaderKeyboard } from '@/lib/reader-gestures'
import { bookFileContentUrl, type BookFile } from '@/services/api'

interface PdfReaderProps {
  title: string
  cover?: string
  bookId: number
  file: BookFile
  onTopHoverChange: (hovered: boolean) => void
  onToggleUi: () => void
}

type PdfOutline = NonNullable<Awaited<ReturnType<PDFDocumentProxy['getOutline']>>>
function Outline({ items, onSelect }: { items: PdfOutline; onSelect: (item: PdfOutline[number]) => void }) {
  return <ol>{items.map((item, index) => <li key={index}>
    <button type="button" disabled={!item.dest} onClick={() => onSelect(item)}>{item.title}</button>
    {!!item.items?.length && <Outline items={item.items} onSelect={onSelect} />}
  </li>)}</ol>
}

export function PdfReader({ title, cover, bookId, file, onTopHoverChange, onToggleUi }: PdfReaderProps) {
  const { session, jump } = useReaderWorkspace()
  const restoredPage = () => { const saved = session.getProgress(); return saved?.kind === 'pdf' ? saved.page : 1 }
  const [outline, setOutline] = useState<PdfOutline>([])
  const [tocOpen, setTocOpen] = useState(false)
  const [navigationError, setNavigationError] = useState('')
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
      renderTask = pdfPage.render({ canvas, canvasContext: context, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] })
      await renderTask.promise
      if (!cancelled) setLoading(false)
    }
    void render().catch((renderError) => {
      if (!cancelled && (renderError as Error).name !== 'RenderingCancelledException') { setError((renderError as Error).message); setLoading(false) }
    })
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [document, frameWidth, page, zoom])

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
      getSelection: () => window.getSelection()?.toString() ?? '',
      getWidth: () => frame.clientWidth,
      onNext: () => setPage((current) => Math.min(pages || 1, current + 1)),
      onPrevious: () => setPage((current) => Math.max(1, current - 1)),
      onTopHoverChange,
      onToggleControls: onToggleUi,
    })
  }, [onToggleUi, onTopHoverChange, pages, zoom])

  useEffect(() => bindReaderKeyboard(window, {
    getSelection: () => window.getSelection()?.toString() ?? '',
    onNext: () => setPage((current) => Math.min(pages || 1, current + 1)),
    onPrevious: () => setPage((current) => Math.max(1, current - 1)),
  }), [pages])

  useEffect(() => {
    if (jump?.position.kind === 'pdf' && pages) setPage(Math.min(pages, Math.max(1, jump.position.page)))
  }, [jump, pages])

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
        <aside className="reader-toc is-open" aria-label="PDF 目录">
          <div className="reader-toc-heading"><span>目录</span><Button size="icon" variant="ghost" aria-label="关闭目录" onClick={() => setTocOpen(false)}><X /></Button></div>
          {outline.length ? <Outline items={outline} onSelect={item => void displayChapter(item)} /> : <p>此 PDF 没有内嵌目录，可使用页码跳转。</p>}
        </aside>
        <button className="reader-toc-scrim" type="button" aria-label="关闭目录遮罩" onClick={() => setTocOpen(false)} />
      </>}
      <section ref={frameRef} style={{ touchAction: zoom > 1 ? 'pan-x pan-y pinch-zoom' : 'pan-y pinch-zoom' }} className="pdf-viewport" tabIndex={0} aria-label="PDF reading area">
        <canvas ref={canvasRef} />
        {loading && <ReaderLoading title={title} cover={cover} message="正在打开 PDF…" />}
        {error && <div className="reader-state reader-error"><strong>Could not open this PDF</strong><span>{error}</span><Button variant="outline" onClick={() => setRetry(value => value + 1)}>重试</Button></div>}
      </section>
      <div className="reader-chapter-controls reader-pdf-controls" aria-label="Page navigation">
        <Button size="icon" variant="ghost" aria-label="Open table of contents" onClick={() => setTocOpen(true)}><List /></Button>
        <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page"><ChevronLeft /></Button>
        <div className="pdf-page-control"><span>Page</span><input aria-label="Current page" type="number" min={1} max={pages || 1} value={page} onChange={(event) => setPage(Math.min(pages || 1, Math.max(1, Number(event.target.value))))} /><span>of {pages || '—'}</span></div>
        <Button size="icon" variant="ghost" disabled={!pages || page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} aria-label="Next page"><ChevronRight /></Button>
        <span className="reader-control-divider" />
        <Button size="icon" variant="ghost" disabled={zoom <= 0.7} onClick={() => setZoom((current) => Math.max(0.7, current - 0.1))} aria-label="Zoom out"><Minus /></Button>
        <small>{Math.round(zoom * 100)}%</small>
        <Button size="icon" variant="ghost" disabled={zoom >= 1.8} onClick={() => setZoom((current) => Math.min(1.8, current + 0.1))} aria-label="Zoom in"><Plus /></Button>
      </div>
      {navigationError && <button type="button" className="reader-navigation-error" onClick={() => setNavigationError('')}>{navigationError}</button>}
    </div>
  )
}
