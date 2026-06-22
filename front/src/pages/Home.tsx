import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FileText, FolderOpen, Hash, Clock } from 'lucide-react'
import { listArticles, getCategories, getTags, type Article, type Category, type Tag } from '@/services/api'
import { StatCard, ListCard, StatRow } from '@/components/dashboard'
import { HoverList } from '@/components/HoverList'
import { ActivityChart, monthlyActivity } from '@/components/ActivityChart'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const [arts, setArts] = useState<Article[] | null>(null)
  const [cats, setCats] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listArticles({ pageSize: 500 }), getCategories(), getTags()])
      .then(([a, c, t]) => {
        setArts(a.articles)
        setCats(c)
        setTags(t)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const recent = useMemo(() => (arts ?? []).slice(0, 8), [arts])
  const chartData = useMemo(() => monthlyActivity(arts ?? []), [arts])
  const catCounts = useMemo(
    () =>
      cats
        .map((c) => ({ ...c, count: (arts ?? []).filter((a) => a.category === c.name).length }))
        .sort((a, b) => b.count - a.count),
    [cats, arts]
  )

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <Helmet>
        <title>chuyi's blog</title>
      </Helmet>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{greeting()}, xirichuyi</h1>
        <p className="mt-2 text-muted-foreground">Welcome back — my blog &amp; notes.</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive">Failed to load: {error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
            <StatCard label="Posts" value={arts?.length ?? '—'} sub="published" icon={FileText} />
            <StatCard label="Categories" value={cats.length || '—'} sub="total" icon={FolderOpen} />
            <StatCard label="Tags" value={tags.length || '—'} sub="total" icon={Hash} />
            <StatCard label="Last updated" value={arts?.[0]?.date ?? '—'} icon={Clock} />
          </div>

          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-semibold">Posting activity</h3>
              <span className="text-xs text-muted-foreground">Last 12 months</span>
            </div>
            {!arts ? <Skeleton className="h-[260px] w-full" /> : <ActivityChart data={chartData} />}
          </section>

          <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ListCard
                title="Recent posts"
                icon={FileText}
                action={
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                    <Link to="/articles">All →</Link>
                  </Button>
                }
              >
                {!arts ? (
                  <RowsSkeleton />
                ) : recent.length === 0 ? (
                  <p className="py-6 text-sm text-muted-foreground">No posts yet.</p>
                ) : (
                  <HoverList articles={recent} />
                )}
              </ListCard>
            </div>

            <ListCard title="Categories" icon={FolderOpen} count={cats.length}>
              {!arts ? (
                <RowsSkeleton n={5} />
              ) : (
                catCounts.map((c) => <StatRow key={c.id} label={c.name} value={c.count} />)
              )}
            </ListCard>
          </div>
        </>
      )}
    </div>
  )
}

function RowsSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
