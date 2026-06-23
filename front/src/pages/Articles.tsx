import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { listArticles, getCategories, getTags, type Article, type Category, type Tag } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Filter = { type: 'category' | 'tag' | null; value: string | null }

/** 归档左栏日期:MM-DD。 */
function monthDay(raw?: string) {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-sm transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export default function Articles() {
  const [all, setAll] = useState<Article[] | null>(null)
  const [cats, setCats] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [filter, setFilter] = useState<Filter>({ type: null, value: null })

  useEffect(() => {
    Promise.all([listArticles({ pageSize: 500 }), getCategories(), getTags()])
      .then(([a, c, t]) => {
        setAll(a.articles)
        setCats(c)
        setTags(t)
      })
      .catch(() => setAll([]))
  }, [])

  const filtered = useMemo(() => {
    const l = all ?? []
    if (filter.type === 'category') return l.filter((a) => a.category === filter.value)
    if (filter.type === 'tag') return l.filter((a) => a.tags.includes(filter.value!))
    return l
  }, [all, filter])

  const groups = useMemo(() => {
    const g: { year: string; items: Article[] }[] = []
    for (const a of filtered) {
      const y = a.rawDate ? String(new Date(a.rawDate).getFullYear()) : '—'
      let x = g.find((z) => z.year === y)
      if (!x) {
        x = { year: y, items: [] }
        g.push(x)
      }
      x.items.push(a)
    }
    g.sort((a, b) => b.year.localeCompare(a.year))
    return g
  }, [filtered])

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <Helmet>
        <title>Archive · chuyi's blog</title>
      </Helmet>

      <p className="mb-6 text-sm text-muted-foreground">{all?.length ?? 0} posts · filter by category or tag.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <Pill active={filter.type === null} onClick={() => setFilter({ type: null, value: null })}>
          All
        </Pill>
        {cats.map((c) => (
          <Pill
            key={c.id}
            active={filter.type === 'category' && filter.value === c.name}
            onClick={() => setFilter({ type: 'category', value: c.name })}
          >
            {c.name}
          </Pill>
        ))}
        {tags.map((t) => (
          <Pill
            key={`t-${t.id}`}
            active={filter.type === 'tag' && filter.value === t.name}
            onClick={() => setFilter({ type: 'tag', value: t.name })}
          >
            #{t.name}
          </Pill>
        ))}
      </div>

      {!all ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No posts match this filter.</p>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.year}>
              {/* 年份分段标题:无 icon,大字 + 计数 + 细分隔线 */}
              <div className="mb-2 flex items-baseline justify-between border-b border-border pb-2">
                <h2 className="text-lg font-semibold tracking-tight tabular-nums">{g.year}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">{g.items.length}</span>
              </div>

              {/* 归档行:左侧固定日期栏 + 标题,hover 由浅变深 */}
              <ul>
                {g.items.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/article/${a.id}`}
                      className="group flex items-baseline gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                    >
                      <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground/70">
                        {monthDay(a.rawDate)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] text-foreground/60 transition-colors group-hover:text-foreground">
                        {a.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
