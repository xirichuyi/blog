import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Article } from '@/services/api'

// cai.im's springy easing.
const SPRING = 'cubic-bezier(.25,1.22,.45,1.04)'
const PREVIEW_W = 288

/** cai.im-style list: sliding highlight pill, sibling dimming, and a
 *  cover-image preview that springs to align with the hovered row. */
export function HoverList({ articles }: { articles: Article[] }) {
  const listRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ top: 0, height: 0, on: false })
  const [preview, setPreview] = useState<{ src: string; left: number; top: number } | null>(null)
  const [shown, setShown] = useState(false)

  const enter = (e: React.MouseEvent<HTMLAnchorElement>, a: Article) => {
    const el = e.currentTarget
    setPill({ top: el.offsetTop, height: el.offsetHeight, on: true })
    if (a.coverImage) {
      const r = el.getBoundingClientRect()
      const listR = listRef.current?.getBoundingClientRect()
      let left = (listR?.right ?? r.right) + 28
      if (left + PREVIEW_W > window.innerWidth - 16) left = window.innerWidth - PREVIEW_W - 16
      const top = Math.max(96, Math.min(r.top + r.height / 2, window.innerHeight - 130))
      setPreview({ src: a.coverImage, left, top })
      setShown(true)
    } else {
      setShown(false)
    }
  }

  const leave = () => {
    setPill((p) => ({ ...p, on: false }))
    setShown(false)
  }

  return (
    <div ref={listRef} className="hover-list relative" onMouseLeave={leave}>
      {/* sliding highlight pill */}
      <div
        className="pointer-events-none absolute inset-x-0 -z-10 rounded-xl bg-accent"
        style={{
          height: pill.height,
          transform: `translateY(${pill.top}px)`,
          opacity: pill.on ? 1 : 0,
          transition: `transform .45s ${SPRING}, height .4s ${SPRING}, opacity .25s ease`,
        }}
      />

      {articles.map((a) => (
        <Link
          key={a.id}
          to={`/article/${a.id}`}
          onMouseEnter={(e) => enter(e, a)}
          className="relative flex items-baseline justify-between gap-6 rounded-xl px-3 py-3"
        >
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium text-foreground">{a.title}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {a.category}
              {a.tags.length > 0 && ` · ${a.tags.slice(0, 2).join(' · ')}`}
            </span>
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{a.date}</span>
        </Link>
      ))}

      {/* right-side cover preview that springs to the hovered row */}
      {preview &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60] hidden w-72 -translate-y-1/2 lg:block"
            style={{
              left: preview.left,
              top: preview.top,
              opacity: shown ? 1 : 0,
              transition: `top .48s ${SPRING}, left .3s ease, opacity .25s ease-out`,
            }}
          >
            <div className="aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted shadow-2xl">
              <img
                key={preview.src}
                src={preview.src}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.opacity = '0'
                }}
                className={cn(
                  'h-full w-full object-cover transition-all duration-500 ease-out',
                  shown ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                )}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
