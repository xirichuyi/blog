import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  listArticles,
  getCategories,
  getTags,
  getAbout,
  getHealth,
  stripMarkdown,
  type Article,
  type Category,
  type Tag,
  type About,
  type HealthStatus,
} from '@/services/api'
import { HoverList } from '@/components/HoverList'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function fmtUptime(s?: number) {
  if (!s) return '—'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function Home() {
  const [arts, setArts] = useState<Article[] | null>(null)
  const [cats, setCats] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [about, setAbout] = useState<About | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listArticles({ pageSize: 500 }), getCategories(), getTags()])
      .then(([a, c, t]) => {
        setArts(a.articles)
        setCats(c)
        setTags(t)
      })
      .catch((e) => setError(String(e)))
    getAbout().then(setAbout).catch(() => {})
    getHealth().then(setHealth).catch(() => {})
  }, [])

  const recent = useMemo(() => (arts ?? []).slice(0, 10), [arts])
  const bio = about?.content ? stripMarkdown(about.content, 120) : ''
  const online = health?.status === 'healthy'

  const meta: string[] = []
  if (arts) meta.push(`${arts.length} posts`)
  if (cats.length) meta.push(`${cats.length} categories`)
  if (tags.length) meta.push(`${tags.length} tags`)

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:px-8">
      <Helmet>
        <title>chuyi's blog</title>
      </Helmet>

      {/* Intro */}
      <header className="mb-14">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 border border-border">
            {about?.photoUrl && <AvatarImage src={about.photoUrl} alt={about.title} />}
            <AvatarFallback className="text-xl">{about?.title?.[0] ?? 'C'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{about?.title ?? "chuyi's blog"}</h1>
            {about?.subtitle && <p className="text-muted-foreground">{about.subtitle}</p>}
          </div>
        </div>

        {bio && <p className="mt-6 leading-relaxed text-foreground/80">{bio}</p>}

        {/* subtle meta line: stats + server, one row */}
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {meta.map((m, i) => (
            <span key={i} className="flex items-center gap-3">
              {i > 0 && <span className="text-border">·</span>}
              {m}
            </span>
          ))}
          {health && (
            <>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className={cn('size-1.5 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />
                {online ? 'online' : 'offline'} · up {fmtUptime(health.uptime_seconds)}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Posts */}
      <section>
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent posts</h2>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/articles">All →</Link>
          </Button>
        </div>

        {error ? (
          <p className="py-4 text-sm text-destructive">Failed to load: {error}</p>
        ) : !arts ? (
          <div className="space-y-1 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <HoverList articles={recent} />
        )}
      </section>
    </div>
  )
}
