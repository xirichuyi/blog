import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from 'lucide-react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist/types/src/display/api'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Button } from '@/components/ui/button'
import { loadReaderProgress, saveReaderProgress } from '@/lib/book-progress'
import { imageUrl, type BookFile } from '@/services/api'

interface PdfReaderProps {
  bookId: number
  file: BookFile
}

function restoredPage(bookId: number, fileId: number): number {
  const saved = loadReaderProgress(bookId, fileId)
  return saved?.kind === 'pdf' ? saved.page : 1
}

export function PdfReader({ bookId, file }: PdfReaderProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(() => restoredPage(bookId, file.id))
  const [pages, setPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [frameWidth, setFrameWidth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
        loadingTask = pdfjs.getDocument({ url: imageUrl(file.file_url) || file.file_url })
        const loaded = await loadingTask.promise
        if (disposed) return void loaded.destroy()
        const initialPage = Math.min(loaded.numPages, Math.max(1, restoredPage(bookId, file.id)))
        setDocument(loaded)
        setPages(loaded.numPages)
        setPage(initialPage)
        setLoading(false)
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
  }, [bookId, file.id, file.file_url])

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
    }
    void render().catch((renderError) => {
      if (!cancelled && (renderError as Error).name !== 'RenderingCancelledException') setError((renderError as Error).message)
    })
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [document, frameWidth, page, zoom])

  useEffect(() => {
    if (pages) saveReaderProgress(bookId, file.id, { kind: 'pdf', page, pages })
  }, [bookId, file.id, page, pages])

  useEffect(() => {
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, select, textarea, button')) return
      if (event.key === 'ArrowLeft') setPage((current) => Math.max(1, current - 1))
      if (event.key === 'ArrowRight') setPage((current) => Math.min(pages, current + 1))
    }
    window.addEventListener('keydown', navigateWithKeyboard)
    return () => window.removeEventListener('keydown', navigateWithKeyboard)
  }, [pages])

  return (
    <div className="pdf-reader">
      <section ref={frameRef} className="pdf-viewport">
        <canvas ref={canvasRef} />
        {loading && <div className="reader-state"><Loader2 className="animate-spin" /> Preparing PDF…</div>}
        {error && <div className="reader-state reader-error"><strong>Could not open this PDF</strong><span>{error}</span></div>}
      </section>
      <footer className="reader-controls">
        <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page"><ChevronLeft /></Button>
        <div className="pdf-page-control"><span>Page</span><input aria-label="Current page" type="number" min={1} max={pages || 1} value={page} onChange={(event) => setPage(Math.min(pages || 1, Math.max(1, Number(event.target.value))))} /><span>of {pages || '—'}</span></div>
        <div className="reader-location"><div><i style={{ width: pages ? `${(page / pages) * 100}%` : '0%' }} /></div><small>{pages ? Math.round((page / pages) * 100) : 0}%</small></div>
        <Button size="icon" variant="ghost" disabled={!pages || page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} aria-label="Next page"><ChevronRight /></Button>
        <span className="reader-control-divider" />
        <Button size="icon" variant="ghost" disabled={zoom <= 0.7} onClick={() => setZoom((current) => Math.max(0.7, current - 0.1))} aria-label="Zoom out"><Minus /></Button>
        <small>{Math.round(zoom * 100)}%</small>
        <Button size="icon" variant="ghost" disabled={zoom >= 1.8} onClick={() => setZoom((current) => Math.min(1.8, current + 0.1))} aria-label="Zoom in"><Plus /></Button>
      </footer>
    </div>
  )
}
