import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Calendar } from 'lucide-react'
import { listArticles, getCategories, getTags, type Article, type Category, type Tag } from '@/services/api'
import { ListCard, ArticleRow } from '@/components/dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Filter = { type: 'category' | 'tag' | null; value: string | null }

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
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
      <Helmet>
        <title>Archive · chuyi's blog</title>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
        <p className="mt-2 text-muted-foreground">{all?.length ?? 0} posts · filter by category or tag.</p>
      </header>

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
        <div className="space-y-6">
          {groups.map((g) => (
            <ListCard key={g.year} title={g.year} icon={Calendar} count={g.items.length}>
              {g.items.map((a, i) => (
                <ArticleRow key={a.id} article={a} index={i} />
              ))}
            </ListCard>
          ))}
        </div>
      )}
    </div>
  )
}
