import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Mail, Github, Send } from 'lucide-react'
import {
  listArticles,
  getAbout,
  getHealth,
  type Article,
  type About,
  type HealthStatus,
} from '@/services/api'
import { HoverList } from '@/components/HoverList'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const CONTACTS = [
  { label: 'xrcy123@gmail.com', icon: Mail, href: 'mailto:xrcy123@gmail.com' },
  { label: 'GitHub', icon: Github, href: 'https://github.com/xirichuyi' },
  { label: 'Telegram', icon: Send, href: 'https://t.me/xrcy97' },
]

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
  const [about, setAbout] = useState<About | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listArticles({ pageSize: 500 })
      .then((a) => setArts(a.articles))
      .catch((e) => setError(String(e)))
    getAbout().then(setAbout).catch(() => {})
    getHealth().then(setHealth).catch(() => {})
  }, [])

  const recent = useMemo(() => (arts ?? []).slice(0, 10), [arts])
  const bioParas = useMemo(
    () =>
      (about?.content || '')
        .split(/\n{1,}/)
        .map((s) => s.trim())
        .filter(Boolean),
    [about]
  )
  const online = health?.status === 'healthy'

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <Helmet>
        <title>chuyi's blog</title>
      </Helmet>

      {/* Intro */}
      <header>
        <Avatar className="size-24 border border-border">
          {about?.photoUrl && <AvatarImage src={about.photoUrl} alt={about.title} />}
          <AvatarFallback className="text-3xl">{about?.title?.[0] ?? 'C'}</AvatarFallback>
        </Avatar>

        <h1 className="mt-6 text-xl font-bold tracking-tight">{about?.title ?? "chuyi's blog"}</h1>
        {about?.subtitle && <p className="mt-1 text-sm text-muted-foreground">{about.subtitle}</p>}

        {bioParas.length > 0 ? (
          <div className="mt-8 space-y-4 text-[15px] leading-7 text-foreground/85">
            {bioParas.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          about === null && <Skeleton className="mt-8 h-16 w-full" />
        )}

        {/* contact pills */}
        <div className="mt-8 flex flex-wrap gap-2">
          {CONTACTS.map((c) => {
            const Icon = c.icon
            return (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icon className="size-4" />
                {c.label}
              </a>
            )
          })}
        </div>

        {/* tiny server line */}
        {health && (
          <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('size-1.5 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />
            server {online ? 'online' : 'offline'} · up {fmtUptime(health.uptime_seconds)}
          </p>
        )}
      </header>

      {/* Blog */}
      <section className="mt-16">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Blog</h2>
          <Link to="/articles" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            All →
          </Link>
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
