import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Article } from '@/services/api'

// cai.im's springy easing.
const SPRING = 'cubic-bezier(.25,1.22,.45,1.04)'
const PREVIEW_W = 288

/** cai.im-style list: title + meta stacked, left-aligned. The highlight pill
 *  sizes to each row's content width and springs between rows. */
export function HoverList({ articles }: { articles: Article[] }) {
  const listRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ x: 0, y: 0, w: 0, h: 0, on: false })
  const [preview, setPreview] = useState<{ src: string; left: number; top: number } | null>(null)
  const [shown, setShown] = useState(false)

  const enter = (e: React.MouseEvent<HTMLAnchorElement>, a: Article) => {
    const el = e.currentTarget
    setPill({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, on: true })
    if (a.coverImage) {
      const r = el.getBoundingClientRect()
      const listR = listRef.current?.getBoundingClientRect()
      let left = (listR?.right ?? r.right) + 28
      if (left + PREVIEW_W > window.innerWidth - 16) left = window.innerWidth - PREVIEW_W - 16
      const top = Math.max(96, Math.min(r.top + r.height / 2, window.innerHeight - 130))
      // Preload: only reveal the preview once the image actually loads,
      // so broken cover URLs never show an empty frame.
      const src = a.coverImage
      const img = new Image()
      img.onload = () => {
        setPreview({ src, left, top })
        setShown(true)
      }
      img.onerror = () => setShown(false)
      img.src = src
    } else {
      setShown(false)
    }
  }

  const leave = () => {
    setPill((p) => ({ ...p, on: false }))
    setShown(false)
  }

  return (
    <div ref={listRef} className="hover-list relative flex flex-col items-start gap-1" onMouseLeave={leave}>
      {/* highlight pill — sized to the hovered row's content */}
      <div
        className="pointer-events-none absolute left-0 top-0 -z-10 rounded-xl bg-accent"
        style={{
          width: pill.w,
          height: pill.h,
          transform: `translate(${pill.x}px, ${pill.y}px)`,
          opacity: pill.on ? 1 : 0,
          transition: `transform .45s ${SPRING}, width .4s ${SPRING}, height .4s ${SPRING}, opacity .25s ease`,
        }}
      />

      {articles.map((a) => (
        <Link
          key={a.id}
          to={`/article/${a.id}`}
          onMouseEnter={(e) => enter(e, a)}
          className="relative flex w-fit max-w-full flex-col gap-0.5 rounded-xl px-3 py-2.5"
        >
          <span className="truncate text-[15px] font-medium text-foreground">{a.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {a.category}
            {a.tags.length > 0 && ` · ${a.tags.slice(0, 2).join(' · ')}`} · {a.date}
          </span>
        </Link>
      ))}

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
