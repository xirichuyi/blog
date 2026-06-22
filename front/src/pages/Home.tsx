import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FileText, FolderOpen, Hash, Clock } from 'lucide-react'
import { listArticles, getCategories, getTags, type Article, type Category, type Tag } from '@/services/api'
import { StatCard, ListCard, ArticleRow, StatRow } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
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
        <h1 className="text-3xl font-bold tracking-tight">{greeting()}，xirichuyi</h1>
        <p className="mt-2 text-muted-foreground">欢迎回来，这里是我的博客与笔记。</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive">加载失败：{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="文章总数" value={arts?.length ?? '—'} sub="已发布" icon={FileText} />
            <StatCard label="分类" value={cats.length || '—'} sub="个分类" icon={FolderOpen} />
            <StatCard label="标签" value={tags.length || '—'} sub="个标签" icon={Hash} />
            <StatCard label="最近更新" value={arts?.[0]?.date ?? '—'} icon={Clock} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ListCard
                title="最新文章"
                icon={FileText}
                action={
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                    <Link to="/articles">全部 →</Link>
                  </Button>
                }
              >
                {!arts ? (
                  <RowsSkeleton />
                ) : recent.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-muted-foreground">还没有文章。</p>
                ) : (
                  recent.map((a, i) => <ArticleRow key={a.id} article={a} index={i} />)
                )}
              </ListCard>
            </div>

            <ListCard title="分类" icon={FolderOpen} count={cats.length}>
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
