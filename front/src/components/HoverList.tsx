import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { Article } from '@/services/api'

/** A single flat highlight follows the active row, as on cai.im. */
export function HoverList({ articles }: { articles: Article[] }) {
  const listRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  const [preview, setPreview] = useState<{ src: string; left: number; top: number; shown: boolean } | null>(null)

  useEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    let active: HTMLAnchorElement | null = null
    let hovered: HTMLAnchorElement | null = null
    let focused: HTMLAnchorElement | null = null
    let previewRequest = 0
    let previewRow: HTMLAnchorElement | null = null
    const hidePreview = () => {
      previewRequest++
      previewRow = null
      setPreview((previous) => previous ? { ...previous, shown: false } : null)
    }
    const previewPosition = (row: HTMLAnchorElement) => {
      const rect = row.getBoundingClientRect()
      return {
        left: Math.max(window.scrollX + 16, Math.min(rect.right + window.scrollX + 18, window.scrollX + window.innerWidth - 248)),
        top: rect.top + window.scrollY + rect.height / 2,
      }
    }
    const showPreview = (row: HTMLAnchorElement) => {
      if (previewRow === row) return
      hidePreview()
      const src = articles.find((article) => article.id === row.dataset.articleId)?.coverImage
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
    const position = (row: HTMLAnchorElement, scale: number) => {
      // Layout dimensions exclude the row's CSS hover scale.
      indicator.style.width = `${row.offsetWidth}px`
      indicator.style.height = `${row.offsetHeight}px`
      indicator.style.transform = `translate3d(${row.offsetLeft}px, ${row.offsetTop}px, 0) scale(${scale})`
    }
    const show = (row: HTMLAnchorElement) => {
      cancelHide()
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
      const row = target instanceof Element ? target.closest<HTMLAnchorElement>('.hover-list-item') : null
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
        setPreview((previous) => previous ? { ...previous, ...next } : null)
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
  }, [articles])

  return (
    <div ref={listRef} className="hover-list relative isolate flex max-w-full flex-col items-start gap-1">
      <div ref={indicatorRef} className="hover-list-indicator" aria-hidden="true" />
      {articles.map((a) => (
        <Link
          key={a.id}
          data-article-id={a.id}
          to={`/article/${a.id}`}
          className="hover-list-item group relative flex w-fit max-w-full flex-col gap-0.5 rounded-md px-3 py-2.5"
        >
          <span className="max-w-full truncate text-[15px] font-medium text-foreground/55 transition-colors duration-300 group-hover:text-foreground group-focus-visible:text-foreground">{a.title}</span>
          <span className="max-w-full truncate text-xs text-muted-foreground transition-colors group-hover:text-foreground/60">
            {a.category}
            {a.tags.length > 0 && ` · ${a.tags.slice(0, 2).join(' · ')}`} · {a.date}
          </span>
        </Link>
      ))}
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
