import { Link } from 'react-router-dom'
import type { Article } from '@/services/api'
import { HoverSurface } from '@/components/HoverSurface'

export function HoverList({ articles }: { articles: Article[] }) {
  return (
    <HoverSurface className="flex max-w-full flex-col items-start gap-1">
      {articles.map((a) => (
        <Link
          key={a.id}
          data-cover-src={a.coverImage}
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
    </HoverSurface>
  )
}
