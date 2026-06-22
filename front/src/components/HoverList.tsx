import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { Article } from '@/services/api'

type Preview = { src: string; x: number; y: number }

/** cai.im-style minimal post list: title + meta, with a cover image
 *  that floats to the right of the cursor on hover (desktop only). */
export function HoverList({ articles }: { articles: Article[] }) {
  const [preview, setPreview] = useState<Preview | null>(null)

  return (
    <div className="flex flex-col">
      {articles.map((a) => {
        const show = (e: React.MouseEvent) => {
          if (a.coverImage) setPreview({ src: a.coverImage, x: e.clientX, y: e.clientY })
        }
        return (
          <Link
            key={a.id}
            to={`/article/${a.id}`}
            onMouseEnter={show}
            onMouseMove={show}
            onMouseLeave={() => setPreview(null)}
            className="group flex items-baseline justify-between gap-6 border-b border-border/50 py-3 transition-colors last:border-0"
          >
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-medium text-foreground/85 transition-colors group-hover:text-foreground">
                {a.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {a.category}
                {a.tags.length > 0 && ` · ${a.tags.slice(0, 2).join(' · ')}`}
              </span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{a.date}</span>
          </Link>
        )
      })}

      {preview &&
        createPortal(
          <img
            key={preview.src}
            src={preview.src}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            className="pointer-events-none fixed z-[60] hidden aspect-[16/10] w-72 rounded-xl border border-border object-cover shadow-2xl duration-200 animate-in fade-in zoom-in-95 md:block"
            style={{
              left: Math.min(preview.x + 28, window.innerWidth - 304),
              top: Math.max(16, Math.min(preview.y - 90, window.innerHeight - 200)),
            }}
          />,
          document.body
        )}
    </div>
  )
}
