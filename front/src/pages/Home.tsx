import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Mail, Github, Send, Linkedin } from 'lucide-react'
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
  { label: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/' },
]

function fmtUptime(s?: number) {
  if (!s) return '—'
  const d = Math.floor(s / 86400)
  return `${d} 天`
}

export default function Home() {
  const [arts, setArts] = useState<Article[] | null>(null)
  const [about, setAbout] = useState<About | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listArticles({ pageSize: 10 })
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
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <Helmet>
        <title>chuyi's blog</title>
      </Helmet>

      {/* Intro */}
      <header className="home-intro">
        <p className="literary-kicker mb-7">一隅 · 文字与生活</p>
        <div className="home-avatar-frame">
          <Avatar className="size-20 border border-border/70 sm:size-24">
            {about?.photoUrl && <AvatarImage src={about.photoUrl} alt={about.title} />}
            <AvatarFallback className="text-3xl">{about?.title?.[0] ?? 'C'}</AvatarFallback>
          </Avatar>
        </div>

        <h1 className="literary-title mt-7 text-2xl">{about?.title ?? "chuyi's blog"}</h1>
        {about?.subtitle && <p className="mt-2 text-sm leading-6 text-muted-foreground">{about.subtitle}</p>}

        {bioParas.length > 0 ? (
          <div className="mt-8 space-y-4 text-[15px] leading-7 text-foreground/85">
            {bioParas.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          about === null && <Skeleton className="mt-8 h-16 w-full" />
        )}

        <p className="home-note">在喧嚣之外，留一处给文字与时间。</p>

        <div className="mt-7 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          {CONTACTS.map((c) => {
            const Icon = c.icon
            return (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="home-contact"
              >
                <Icon className="size-3.5" />
                {c.label}
              </a>
            )
          })}
        </div>

        {health && (
          <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground/80">
            <span className={cn('size-1.5 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />
            {online ? '此间已安静生长' : '站点暂时离线'} {online && fmtUptime(health.uptime_seconds)}
          </p>
        )}
      </header>

      {/* Blog */}
      <section className="mt-20">
        <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
          <h2 className="literary-kicker">近来写下</h2>
          <Link to="/articles" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            所有文章 →
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

      <nav className="mt-24 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-border/70 pt-7 text-xs text-muted-foreground" aria-label="更多内容">
        <Link to="/books" className="transition-colors hover:text-primary">书架</Link>
        <Link to="/changelog" className="transition-colors hover:text-primary">更新日志</Link>
        <Link to="/guestbook" className="transition-colors hover:text-primary">留言簿</Link>
        <a href="/rss.xml" className="transition-colors hover:text-primary">RSS</a>
      </nav>
    </div>
  )
}
