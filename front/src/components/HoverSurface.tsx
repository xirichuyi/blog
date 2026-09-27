import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/** A single flat highlight follows the active row, as on cai.im. */
export function HoverSurface({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  const listRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  const [preview, setPreview] = useState<{ src: string; left: number; top: number; shown: boolean } | null>(null)

  useEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    indicator.style.opacity = '0'
    setPreview(null)

    let active: HTMLElement | null = null
    let hovered: HTMLElement | null = null
    let focused: HTMLElement | null = null
    let previewRequest = 0
    let previewRow: HTMLElement | null = null
    const hidePreview = () => {
      previewRequest++
      previewRow = null
      setPreview((previous) => previous?.shown ? { ...previous, shown: false } : previous)
    }
    const previewPosition = (row: HTMLElement) => {
      const rect = row.getBoundingClientRect()
      return {
        left: Math.max(window.scrollX + 16, Math.min(rect.right + window.scrollX + 18, window.scrollX + window.innerWidth - 248)),
        top: rect.top + window.scrollY + rect.height / 2,
      }
    }
    const showPreview = (row: HTMLElement) => {
      if (previewRow === row) return
      hidePreview()
      const src = row.dataset.coverSrc
      if (!src || !window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches) return
      previewRow = row
      const request = previewRequest
      const image = new Image()
      image.onload = () => {
        if (request !== previewRequest) return
        setPreview({ src, ...previewPosition(row), shown: true })
      }
      image.onerror = () => {
        if (request === previewRequest) hidePreview()
      }
      image.src = src
    }
    let hideTimer: ReturnType<typeof setTimeout> | undefined

    const cancelHide = () => clearTimeout(hideTimer)
    const position = (row: HTMLElement, scale: number) => {
      // Layout dimensions exclude the row's CSS hover scale.
      const width = row.offsetWidth
      const height = row.offsetHeight
      let x = 0
      let y = 0
      let node: HTMLElement | null = row
      while (node && node !== list) {
        x += node.offsetLeft
        y += node.offsetTop
        node = node.offsetParent as HTMLElement | null
      }
      indicator.style.width = `${width}px`
      indicator.style.height = `${height}px`
      indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
    }
    const show = (row: HTMLElement) => {
      cancelHide()
      // Descendant pointer transitions must not repeat layout reads or preview work.
      if (active === row && indicator.style.opacity === '1') return
      active = row
      showPreview(row)
      if (indicator.style.opacity !== '1') {
        // Start at the entered row instead of flying in from the previous row.
        indicator.style.transition = 'none'
        position(row, 0.95)
        void indicator.offsetHeight
        indicator.style.transition = ''
      }
      position(row, 1)
      indicator.style.opacity = '1'
    }
    const settle = () => {
      cancelHide()
      if (hovered || focused) {
        show((hovered || focused)!)
        return
      }
      // Bridge the gaps between rows without flickering.
      hideTimer = setTimeout(() => {
        hidePreview()
        indicator.style.opacity = '0'
        if (active) position(active, 0.95)
        active = null
      }, 100)
    }
    const rowAt = (target: EventTarget | null) => {
      const row = target instanceof Element ? target.closest<HTMLElement>('.hover-list-item') : null
      return row && list.contains(row) ? row : null
    }
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      hovered = rowAt(event.target)
      if (hovered) show(hovered)
    }
    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      hovered = rowAt(event.relatedTarget)
      settle()
    }
    const onFocusIn = (event: FocusEvent) => {
      focused = rowAt(event.target)
      if (focused) show(focused)
    }
    const onFocusOut = (event: FocusEvent) => {
      focused = rowAt(event.relatedTarget)
      settle()
    }
    const observer = new ResizeObserver(() => {
      if (active) position(active, 1)
      if (previewRow) {
        const next = previewPosition(previewRow)
        setPreview((previous) => previous && (previous.left !== next.left || previous.top !== next.top) ? { ...previous, ...next } : previous)
      }
    })
    observer.observe(list)
    list.querySelectorAll('.hover-list-item').forEach((row) => observer.observe(row))
    list.addEventListener('pointerover', onPointerOver)
    list.addEventListener('pointerout', onPointerOut)
    list.addEventListener('focusin', onFocusIn)
    list.addEventListener('focusout', onFocusOut)
    return () => {
      cancelHide()
      previewRequest++
      observer.disconnect()
      list.removeEventListener('pointerover', onPointerOver)
      list.removeEventListener('pointerout', onPointerOut)
      list.removeEventListener('focusin', onFocusIn)
      list.removeEventListener('focusout', onFocusOut)
    }
  }, [children])

  return (
    <div ref={listRef} className={cn("hover-list relative isolate", className)} aria-label={label}>
      <div ref={indicatorRef} className="hover-list-indicator" aria-hidden="true" />
      {children}
      {preview && createPortal(
        <div
          className="hover-list-preview pointer-events-none absolute z-[60] hidden w-[232px] -translate-y-1/2 lg:block"
          style={{ left: preview.left, top: preview.top, opacity: preview.shown ? 1 : 0 }}
          aria-hidden="true"
        >
          <div className="aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted shadow-2xl">
            <img src={preview.src} alt="" className="h-full w-full object-cover" />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
