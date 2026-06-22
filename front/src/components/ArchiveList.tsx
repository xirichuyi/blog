import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { Article } from '@/services/api'

function shortDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function yearOf(iso: string) {
  return iso ? String(new Date(iso).getFullYear()) : '—'
}

/** Compact, image-free archive: posts grouped by year, date + title rows. */
export function ArchiveList({ articles }: { articles: Article[] }) {
  const groups: { year: string; items: Article[] }[] = []
  for (const a of articles) {
    const y = yearOf(a.rawDate)
    let g = groups.find((x) => x.year === y)
    if (!g) {
      g = { year: y, items: [] }
      groups.push(g)
    }
    g.items.push(a)
  }
  groups.sort((a, b) => b.year.localeCompare(a.year))

  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.year}>
          <h2 className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground">{g.year}</h2>
          <ul>
            {g.items.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/article/${a.id}`}
                  className="group -mx-2 flex items-baseline gap-4 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/60"
                >
                  <span className="w-14 shrink-0 text-sm tabular-nums text-muted-foreground">{shortDate(a.rawDate)}</span>
                  <span className="font-medium underline-offset-4 group-hover:text-primary group-hover:underline">
                    {a.title}
                  </span>
                  {a.category && a.category !== 'Uncategorized' && (
                    <Badge variant="outline" className="ml-auto hidden shrink-0 sm:inline-flex">
                      {a.category}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
