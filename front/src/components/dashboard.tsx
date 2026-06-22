import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Article } from '@/services/api'

/** cdk-style stat card: label + big number + icon. */
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
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  )
}

/** cdk-style list card: header (icon + title + count) over a list of rows. */
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
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="ml-auto flex items-center gap-2">
          {count != null && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
          {action}
        </div>
      </div>
      <div className="p-2">{children}</div>
    </Card>
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
