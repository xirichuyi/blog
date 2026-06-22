import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { getArticle, type Article } from '@/services/api'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface Heading {
  id: string
  text: string
  level: number
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    setArticle(null)
    setError(null)
    window.scrollTo(0, 0)
    getArticle(id)
      .then(setArticle)
      .catch((e) => setError(String(e)))
  }, [id])

  // After markdown renders, read heading IDs (set by rehype-slug) from the DOM.
  useEffect(() => {
    if (!article || !contentRef.current) return
    const nodes = Array.from(contentRef.current.querySelectorAll('h2, h3')) as HTMLElement[]
    setHeadings(nodes.map((h) => ({ id: h.id, text: h.textContent || '', level: h.tagName === 'H2' ? 2 : 3 })))
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveId((e.target as HTMLElement).id)),
      { rootMargin: '-80px 0px -70% 0px' }
    )
    nodes.forEach((h) => obs.observe(h))
    return () => obs.disconnect()
  }, [article])

  if (error) {
    return (
      <div className="container mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <div>
          <h2 className="text-xl font-semibold">文章未找到</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => navigate('/articles')}>
          <ArrowLeft /> 返回文章列表
        </Button>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> 加载中…
      </div>
    )
  }

  return (
    <div className="container py-12">
      <Helmet>
        <title>{article.title} · chuyi's blog</title>
      </Helmet>

      <div className={cn('grid grid-cols-1 gap-10', headings.length > 0 && 'lg:grid-cols-[1fr_220px]')}>
        <article className="mx-auto w-full min-w-0 max-w-3xl">
          <Button variant="ghost" size="sm" className="-ml-2 mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft /> 返回
          </Button>

          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <Badge variant="secondary">{article.category}</Badge>
            <span>{article.date}</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>

          {article.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {article.tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          <Separator className="my-8" />

          <div ref={contentRef}>
            <Markdown content={article.content} />
          </div>
        </article>

        {headings.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">目录</h3>
              <nav className="space-y-1 border-l border-border">
                {headings.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    className={cn(
                      '-ml-px block border-l-2 py-1 pl-3 text-sm transition-colors',
                      activeId === h.id
                        ? 'border-primary font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                      h.level === 3 && 'pl-6'
                    )}
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
