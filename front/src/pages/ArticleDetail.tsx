import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Focus,
  Loader2,
  AlertCircle,
  Share2,
} from 'lucide-react'
import { getArticle, listArticles, stripMarkdown, type Article } from '@/services/api'
import { Markdown } from '@/components/Markdown'
import { SEO } from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSiteUI } from '@/lib/site-ui'
import { cn } from '@/lib/utils'

interface Heading {
  id: string
  text: string
  level: number
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { zen, toggleZen, exitZen } = useSiteUI()
  const [article, setArticle] = useState<Article | null>(null)
  const [archive, setArchive] = useState<Article[]>([])
  const [error, setError] = useState<string | null>(null)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState('')
  const [progress, setProgress] = useState(0)
  const [shared, setShared] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    setArticle(null)
    setError(null)
    window.scrollTo(0, 0)
    getArticle(id)
      .then(setArticle)
      .catch((e) => setError(String(e)))
    listArticles({ pageSize: 500 })
      .then(({ articles }) => setArchive(articles))
      .catch(() => setArchive([]))
  }, [id])

  useEffect(() => () => exitZen(), [exitZen])

  const adjacent = useMemo(() => {
    const index = archive.findIndex((item) => item.id === article?.id)
    if (index < 0) return { newer: undefined, older: undefined }
    return { newer: archive[index - 1], older: archive[index + 1] }
  }, [archive, article?.id])

  const readMinutes = useMemo(() => {
    if (!article) return 1
    const text = stripMarkdown(article.content, Number.MAX_SAFE_INTEGER)
    return Math.max(1, Math.ceil(text.length / 500))
  }, [article])

  // After markdown renders, read heading IDs (set by rehype-slug) from the DOM.
  useEffect(() => {
    if (!article || !contentRef.current) return
    const nodes = Array.from(contentRef.current.querySelectorAll('h2, h3')) as HTMLElement[]
    setHeadings(nodes.map((h) => ({ id: h.id, text: h.textContent || '', level: h.tagName === 'H2' ? 2 : 3 })))
  }, [article])

  // Scrollspy: the active heading is the last one scrolled above the offset line.
  useEffect(() => {
    if (headings.length === 0) return
    const OFFSET = 120
    const onScroll = () => {
      let current = headings[0].id
      for (const h of headings) {
        const el = document.getElementById(h.id)
        if (el && el.getBoundingClientRect().top <= OFFSET) current = h.id
        else break
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [headings])

  useEffect(() => {
    const updateProgress = () => {
      const content = contentRef.current
      if (!content) return
      const start = content.getBoundingClientRect().top + window.scrollY - 120
      const distance = Math.max(1, content.offsetHeight - window.innerHeight * 0.45)
      setProgress(Math.min(100, Math.max(0, ((window.scrollY - start) / distance) * 100)))
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [article])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key.toLowerCase() === 'j' && adjacent.older) navigate(`/article/${adjacent.older.id}`)
      if (event.key.toLowerCase() === 'k' && adjacent.newer) navigate(`/article/${adjacent.newer.id}`)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [adjacent.newer, adjacent.older, navigate])

  const goTo = (hid: string) => {
    const el = document.getElementById(hid)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' })
  }

  const share = async () => {
    if (!article) return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: stripMarkdown(article.content, 100), url })
      } else {
        await navigator.clipboard.writeText(url)
      }
      setShared(true)
      window.setTimeout(() => setShared(false), 1600)
    } catch {
      // The native share sheet was dismissed.
    }
  }

  if (error) {
    return (
      <div className="container mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <div>
          <h2 className="text-xl font-semibold">Article not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => navigate('/articles')}>
          <ArrowLeft /> Back to articles
        </Button>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="container py-12">
      <SEO
        title={article.title}
        description={stripMarkdown(article.content, 150)}
        path={`/article/${article.id}`}
        image={article.coverImage}
        type="article"
        publishedAt={article.rawDate}
        modifiedAt={article.updatedAt}
        section={article.category}
        tags={article.tags}
      />
      <div
        className="fixed inset-x-0 top-0 z-[70] h-0.5 origin-left bg-foreground transition-transform duration-150"
        style={{ transform: `scaleX(${progress / 100})` }}
        aria-hidden="true"
      />

      <div className={cn('article-grid grid grid-cols-1 gap-10', headings.length > 0 && !zen && 'lg:grid-cols-[1fr_220px]')}>
        <article className="mx-auto w-full min-w-0 max-w-3xl">
          <div className="-ml-2 mb-6 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft /> Back
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={share} aria-label="分享文章">
                {shared ? <Check /> : <Share2 />}
                <span className="hidden sm:inline">{shared ? '已复制' : '分享'}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={toggleZen} aria-pressed={zen}>
                <Focus />
                <span className="hidden sm:inline">{zen ? '退出沉浸' : '沉浸阅读'}</span>
              </Button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <Badge variant="secondary">{article.category}</Badge>
            <span>{article.date}</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" /> {readMinutes} 分钟
            </span>
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

          {(adjacent.newer || adjacent.older) && (
            <nav className="mt-16 grid gap-3 border-t border-border pt-6 sm:grid-cols-2" aria-label="文章导航">
              {adjacent.older ? (
                <button
                  type="button"
                  onClick={() => navigate(`/article/${adjacent.older!.id}`)}
                  className="group rounded-xl border border-border p-4 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronLeft className="size-3.5" /> 较旧一篇 · J
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium">{adjacent.older.title}</span>
                </button>
              ) : (
                <span />
              )}
              {adjacent.newer && (
                <button
                  type="button"
                  onClick={() => navigate(`/article/${adjacent.newer!.id}`)}
                  className="group rounded-xl border border-border p-4 text-right transition-colors hover:bg-accent"
                >
                  <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    K · 较新一篇 <ChevronRight className="size-3.5" />
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium">{adjacent.newer.title}</span>
                </button>
              )}
            </nav>
          )}
        </article>

        {headings.length > 0 && !zen && (
          <aside className="article-aside hidden lg:block">
            <nav className="sticky top-24 space-y-0.5 border-l border-border/70">
              {headings.map((h) => (
                <button
                  key={h.id}
                  onClick={() => goTo(h.id)}
                  className={cn(
                    '-ml-px block w-full border-l-2 py-1 pl-4 text-left text-[13px] leading-snug transition-all duration-300',
                    activeId === h.id
                      ? 'border-foreground font-medium text-foreground'
                      : 'border-transparent text-muted-foreground/60 hover:text-foreground',
                    h.level === 3 && 'pl-7 text-xs'
                  )}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  )
}
