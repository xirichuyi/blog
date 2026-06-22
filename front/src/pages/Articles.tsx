import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ChevronLeft, ChevronRight, FileText, Hash, Folder, LayoutGrid } from 'lucide-react'
import { listArticles, getCategories, getTags, type Article, type Category, type Tag } from '@/services/api'
import { BlogCard } from '@/components/BlogCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 9

type Filter = { type: 'category' | 'tag' | null; value: string | null }

export default function Articles() {
  const [all, setAll] = useState<Article[] | null>(null)
  const [cats, setCats] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [filter, setFilter] = useState<Filter>({ type: null, value: null })
  const [page, setPage] = useState(1)

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
    const list = all ?? []
    if (filter.type === 'category') return list.filter((a) => a.category === filter.value)
    if (filter.type === 'tag') return list.filter((a) => a.tags.includes(filter.value!))
    return list
  }, [all, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const setF = (f: Filter) => {
    setFilter(f)
    setPage(1)
  }

  const countFor = (f: Filter) =>
    (all ?? []).filter((a) =>
      f.type === 'category' ? a.category === f.value : f.type === 'tag' ? a.tags.includes(f.value!) : true
    ).length

  return (
    <div className="container py-12">
      <Helmet>
        <title>Articles · chuyi's blog</title>
      </Helmet>

      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Articles</h1>
        <p className="mt-3 text-muted-foreground">所有已发布的文章，可按分类或标签筛选。</p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          <FilterGroup title="Categories">
            <FilterItem
              icon={<LayoutGrid className="size-4 shrink-0" />}
              label="All"
              count={all?.length ?? 0}
              active={filter.type === null}
              onClick={() => setF({ type: null, value: null })}
            />
            {cats.map((c) => (
              <FilterItem
                key={c.id}
                icon={<Folder className="size-4 shrink-0" />}
                label={c.name}
                count={countFor({ type: 'category', value: c.name })}
                active={filter.type === 'category' && filter.value === c.name}
                onClick={() => setF({ type: 'category', value: c.name })}
              />
            ))}
          </FilterGroup>

          {tags.length > 0 && (
            <FilterGroup title="Tags">
              {tags.map((t) => (
                <FilterItem
                  key={t.id}
                  icon={<Hash className="size-4 shrink-0" />}
                  label={t.name}
                  count={countFor({ type: 'tag', value: t.name })}
                  active={filter.type === 'tag' && filter.value === t.name}
                  onClick={() => setF({ type: 'tag', value: t.name })}
                />
              ))}
            </FilterGroup>
          )}
        </aside>

        {/* Main */}
        <main>
          {!all ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[16/10] rounded-xl" />
              ))}
            </div>
          ) : pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">没有文章</h3>
              <p className="mt-1 text-sm text-muted-foreground">换个筛选条件试试。</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {pageItems.map((a, i) => (
                  <BlogCard key={a.id} article={a} index={i} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
                  <p className="text-sm text-muted-foreground">
                    第 {current} / {totalPages} 页 · 共 {filtered.length} 篇
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                      <ChevronLeft />
                    </Button>
                    <Button variant="outline" size="icon" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function FilterItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-secondary font-medium text-secondary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  )
}
