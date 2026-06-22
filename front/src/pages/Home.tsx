import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { listArticles, type Article } from '@/services/api'
import { ArchiveList } from '@/components/ArchiveList'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listArticles({ pageSize: 12 })
      .then((r) => setArticles(r.articles))
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
      <Helmet>
        <title>chuyi's blog</title>
      </Helmet>

      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Writing &amp; notes</h1>
        <p className="mt-3 text-muted-foreground">全栈开发、技术实践，以及一些零碎的思考。</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive">加载失败：{error}</p>
      ) : !articles ? (
        <ListSkeleton />
      ) : articles.length === 0 ? (
        <p className="text-muted-foreground">还没有文章。</p>
      ) : (
        <>
          <ArchiveList articles={articles} />
          <div className="mt-10">
            <Button asChild variant="outline">
              <Link to="/articles">查看全部文章 →</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}
