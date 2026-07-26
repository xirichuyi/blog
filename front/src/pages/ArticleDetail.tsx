import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
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
import {
  getAdjacentArticles,
  getArticle,
  stripMarkdown,
  type AdjacentArticles,
  type Article,
} from '@/services/api'
import { Markdown } from '@/components/Markdown'
import { SEO } from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MagneticBackButton } from '@/components/MagneticBackButton'
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
  const [adjacent, setAdjacent] = useState<AdjacentArticles>({})
  const [error, setError] = useState<string | null>(null)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState('')
  const [hoveredHeadingId, setHoveredHeadingId] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const tocRef = useRef<HTMLElement>(null)
  const tocPillRef = useRef<HTMLSpanElement>(null)
  const tocProgressRef = useRef<HTMLDivElement>(null)
  const tocPillReadyRef = useRef(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const shareTimerRef = useRef<number | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setArticle(null)
    setAdjacent({})
    setHeadings([])
    setActiveId('')
    setHoveredHeadingId(null)
    tocPillReadyRef.current = false
    setError(null)
    window.scrollTo(0, 0)

    Promise.all([
      getArticle(id, controller.signal),
      getAdjacentArticles(id, controller.signal).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') throw error
        return {}
      }),
    ])
      .then(([nextArticle, nextAdjacent]) => {
        setArticle(nextArticle)
        setAdjacent(nextAdjacent)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setError(error instanceof Error ? error.message : String(error))
      })

    return () => controller.abort()
  }, [id])

  useEffect(
    () => () => {
      exitZen()
      if (shareTimerRef.current !== null) window.clearTimeout(shareTimerRef.current)
    },
    [exitZen],
  )

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

  // Cache document positions and update the progress bar without re-rendering Markdown.
  useEffect(() => {
    const content = contentRef.current
    if (!article || !content) return

    const headingElements = Array.from(content.querySelectorAll<HTMLElement>('h2, h3'))
    let headingOffsets: Array<{ id: string; top: number }> = []
    let contentStart = 0
    let contentEnd = 1
    let contentDistance = 1
    let frame = 0

    const measure = () => {
      const scrollY = window.scrollY
      const contentRect = content.getBoundingClientRect()
      contentStart = contentRect.top + scrollY - 120
      contentEnd = contentRect.top + scrollY + content.offsetHeight
      contentDistance = Math.max(1, content.offsetHeight - window.innerHeight * 0.45)
      headingOffsets = headingElements.map((element) => ({
        id: element.id,
        top: element.getBoundingClientRect().top + scrollY,
      }))
    }

    const renderScrollState = () => {
      frame = 0
      const scrollY = window.scrollY
      const ratio = Math.min(1, Math.max(0, (scrollY - contentStart) / contentDistance))
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${ratio})`
      }

      if (headingOffsets.length > 0) {
        const target = scrollY + 120
        let low = 0
        let high = headingOffsets.length - 1
        let match = 0
        while (low <= high) {
          const middle = Math.floor((low + high) / 2)
          if (headingOffsets[middle].top <= target) {
            match = middle
            low = middle + 1
          } else {
            high = middle - 1
          }
        }

        const current = headingOffsets[match]
        const nextTop = headingOffsets[match + 1]?.top ?? contentEnd
        const sectionDistance = Math.max(1, nextTop - current.top)
        const sectionProgress = Math.min(1, Math.max(0, (target - current.top) / sectionDistance))
        const atPageEnd = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 30
        const activeHeading = atPageEnd ? headingOffsets.at(-1)! : current
        const activeProgress = atPageEnd ? 1 : sectionProgress

        setActiveId(activeHeading.id)

        const tocEntries = Array.from(
          tocRef.current?.querySelectorAll<HTMLElement>('.article-toc-entry') ?? [],
        )
        const tocEntry = tocEntries.find((entry) => entry.dataset.headingId === activeHeading.id)
        if (tocEntry && tocProgressRef.current) {
          const progressHeight = tocEntry.offsetTop + activeProgress * tocEntry.offsetHeight
          tocProgressRef.current.style.height = `${progressHeight}px`
        }
      }
    }

    const scheduleRender = () => {
      if (frame === 0) frame = window.requestAnimationFrame(renderScrollState)
    }
    const measureAndRender = () => {
      measure()
      scheduleRender()
    }

    measureAndRender()
    const resizeObserver = new ResizeObserver(measureAndRender)
    resizeObserver.observe(content)
    window.addEventListener('scroll', scheduleRender, { passive: true })
    window.addEventListener('resize', measureAndRender)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', scheduleRender)
      window.removeEventListener('resize', measureAndRender)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [article])

  useEffect(() => {
    const toc = tocRef.current
    const pill = tocPillRef.current
    const targetId = hoveredHeadingId || activeId
    const entries = Array.from(toc?.querySelectorAll<HTMLElement>('.article-toc-entry') ?? [])
    const target = entries.find((entry) => entry.dataset.headingId === targetId)
    const active = entries.find((entry) => entry.dataset.headingId === activeId)

    if (!toc || !pill || !target) {
      if (pill) pill.style.opacity = '0'
      return
    }

    const updatePill = () => {
      if (!tocPillReadyRef.current) {
        pill.style.transition = 'none'
      }

      pill.style.opacity = '1'
      pill.style.top = `${target.offsetTop}px`
      pill.style.height = `${target.offsetHeight}px`
      pill.style.left = `${target.offsetLeft}px`
      pill.style.width = `${target.offsetWidth}px`

      if (!tocPillReadyRef.current) {
        void pill.offsetHeight
        pill.style.transition = ''
        tocPillReadyRef.current = true
      }
    }

    updatePill()
    if (!hoveredHeadingId && active) {
      const tocBounds = toc.getBoundingClientRect()
      const activeBounds = active.getBoundingClientRect()
      const activeCenter = activeBounds.top + activeBounds.height / 2
      const tocCenter = tocBounds.top + tocBounds.height / 2
      toc.scrollBy({ top: activeCenter - tocCenter, behavior: reduceMotion ? 'auto' : 'smooth' })
    }

    const resizeObserver = new ResizeObserver(updatePill)
    resizeObserver.observe(toc)
    return () => resizeObserver.disconnect()
  }, [activeId, hoveredHeadingId, reduceMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() === 'j' && adjacent.older) navigate(`/article/${adjacent.older.id}`)
      if (event.key.toLowerCase() === 'k' && adjacent.newer) navigate(`/article/${adjacent.newer.id}`)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [adjacent.newer, adjacent.older, navigate])

  const goTo = (hid: string) => {
    const el = document.getElementById(hid)
    if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
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
      if (shareTimerRef.current !== null) window.clearTimeout(shareTimerRef.current)
      shareTimerRef.current = window.setTimeout(() => setShared(false), 1600)
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
    <div className="article-page container py-10 sm:py-14">
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
        ref={progressRef}
        className="article-progress fixed inset-x-0 top-0 z-[70] h-0.5 origin-left transition-transform duration-150"
        style={{ transform: 'scaleX(0)' }}
        aria-hidden="true"
      />

      <div
        className={cn(
          'article-grid grid grid-cols-1 gap-10 lg:gap-8',
          headings.length > 0 && !zen && 'lg:grid-cols-[minmax(0,1fr)_160px] xl:grid-cols-[64px_minmax(0,1fr)_160px]'
        )}
      >
        {headings.length > 0 && !zen && (
          <aside className="article-chapter-rail hidden xl:flex" aria-label="文章编号">
            <span>ARTICLE</span>
            <strong>{String(article.id).padStart(2, '0').slice(-2)}</strong>
            <i aria-hidden="true" />
            <span>CHUYI NOTES</span>
          </aside>
        )}

        <article className="article-main mx-auto w-full min-w-0 max-w-[760px]">
          <div className="article-actions article-reveal -ml-2 mb-8 flex items-center justify-between gap-2">
            <MagneticBackButton onClick={() => navigate(-1)} />
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

          <div className="article-kicker article-reveal mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{article.category}</span>
            <i aria-hidden="true" />
            <span>{article.date}</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" /> {readMinutes} 分钟
            </span>
          </div>

          <h1 className="article-title article-reveal">{article.title}</h1>

          {article.tags.length > 0 && (
            <div className="article-tags article-reveal mt-5 flex flex-wrap gap-2">
              {article.tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          <Separator className="article-separator article-reveal my-9" />

          <div ref={contentRef}>
            <Markdown content={article.content} />
          </div>

          {(adjacent.newer || adjacent.older) && (
            <nav className="article-pagination mt-20 grid gap-3 pt-7 sm:grid-cols-2" aria-label="文章导航">
              {adjacent.older ? (
                <button
                  type="button"
                  onClick={() => navigate(`/article/${adjacent.older!.id}`)}
                  className="group rounded-xl p-4 text-left transition-colors"
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
                  className="group rounded-xl p-4 text-right transition-colors"
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
            <div className="article-aside-inner">
              <nav ref={tocRef} className="article-toc" aria-label="文章目录">
                <div className="article-toc-list">
                  <span
                    ref={tocPillRef}
                    className="article-toc-pill"
                    aria-hidden="true"
                  />
                  <span className="article-toc-progress-timeline" aria-hidden="true">
                    <span ref={tocProgressRef} className="article-toc-progress-fill" />
                  </span>
                  {headings.map((heading) => (
                    <button
                      key={heading.id}
                      onClick={() => goTo(heading.id)}
                      onMouseEnter={() => setHoveredHeadingId(heading.id)}
                      onMouseLeave={() => setHoveredHeadingId(null)}
                      aria-current={activeId === heading.id ? 'location' : undefined}
                      data-heading-id={heading.id}
                      title={heading.text}
                      className={cn(
                        'article-toc-entry',
                        activeId === heading.id && 'active',
                        heading.level === 3 && 'level-three'
                      )}
                    >
                      <span>{heading.text}</span>
                    </button>
                  ))}
                </div>
              </nav>

              {headings.length <= 8 && (
                <div className="article-aside-meta">
                  <dl>
                    <div>
                      <dt>Category</dt>
                      <dd>{article.category}</dd>
                    </div>
                    {article.tags.length > 0 && (
                      <div>
                        <dt>Tags</dt>
                        <dd>{article.tags.join(', ')}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Reading time</dt>
                      <dd>{readMinutes} min read</dd>
                    </div>
                    <div>
                      <dt>Published</dt>
                      <dd>{article.date}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
