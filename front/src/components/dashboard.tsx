import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Article } from '@/services/api'

/** Minimal stat: label + big number + icon, no box. */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground/50" />}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

/** Minimal list section: header with a hairline divider, rows below — no box. */
export function ListCard({
  title,
  icon: Icon,
  count,
  action,
  children,
}: {
  title: string
  icon?: LucideIcon
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-1 flex items-center gap-2 border-b border-border pb-2">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="ml-auto flex items-center gap-2">
          {count != null && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
          {action}
        </div>
      </div>
      <div className="py-1">{children}</div>
    </section>
  )
}

/** Ranked article row: index + title + meta, date on the right. */
export function ArticleRow({ article, index }: { article: Article; index: number }) {
  return (
    <Link
      to={`/article/${article.id}`}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent"
    >
      <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-muted-foreground/70">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{article.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {article.category}
          {article.tags.length > 0 && <span> · {article.tags.slice(0, 2).join(' · ')}</span>}
        </div>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{article.date}</span>
    </Link>
  )
}

/** Thin labelled progress bar (server metrics). */
export function MetricBar({ label, value, icon: Icon }: { label: string; value: number; icon?: LucideIcon }) {
  const v = Math.min(100, Math.max(0, value))
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-xs">
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        <span className="text-muted-foreground">{label}</span>
        <span className="ml-auto font-medium tabular-nums">{v.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground/70 transition-all duration-500" style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

/** Simple labelled row with a numeric value (categories / tags). */
export function StatRow({ label, value, onClick, active }: { label: string; value: number; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{value}</span>
    </button>
  )
}
