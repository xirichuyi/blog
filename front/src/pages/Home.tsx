import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { listArticles, type Article } from '@/services/api'
import { BlogCard } from '@/components/BlogCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listArticles({ page: 1, pageSize: 7 })
      .then((r) => setArticles(r.articles))
      .catch((e) => setError(String(e)))
  }, [])

  const featured = articles?.[0]
  const rest = articles?.slice(1) ?? []

  return (
    <div className="container py-12">
      <Helmet>
        <title>chuyi's blog</title>
      </Helmet>

      <header className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Writing &amp; notes</h1>
        <p className="mt-4 text-lg text-muted-foreground">全栈开发、技术实践，以及一些零碎的思考。</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive">加载失败：{error}</p>
      ) : !articles ? (
        <HomeSkeleton />
      ) : articles.length === 0 ? (
        <p className="text-muted-foreground">还没有文章。</p>
      ) : (
        <div className="space-y-10">
          {featured && <BlogCard article={featured} index={0} featured />}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a, i) => (
                <BlogCard key={a.id} article={a} index={i + 1} />
              ))}
            </div>
          )}
          <div className="flex justify-center pt-2">
            <Button asChild size="lg" variant="outline">
              <Link to="/articles">浏览全部文章</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="space-y-10">
      <Skeleton className="aspect-[2/1] w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/10] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
