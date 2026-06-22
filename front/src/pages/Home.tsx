import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FileText, FolderOpen, Hash, Clock, User, Server, MemoryStick, HardDrive } from 'lucide-react'
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
import { StatCard, ListCard, StatRow, MetricBar } from '@/components/dashboard'
import { HoverList } from '@/components/HoverList'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

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

  const recent = useMemo(() => (arts ?? []).slice(0, 8), [arts])
  const catCounts = useMemo(
    () =>
      cats
        .map((c) => ({ ...c, count: (arts ?? []).filter((a) => a.category === c.name).length }))
        .sort((a, b) => b.count - a.count),
    [cats, arts]
  )
  const bio = about?.content ? stripMarkdown(about.content, 110) : ''
  const online = health?.status === 'healthy'
  const mem = health?.checks?.memory?.details?.usage_percent ?? 0
  const disk = health?.checks?.disk?.details?.usage_percent ?? 0

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

          {/* About + Server */}
          <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px]">
            <section>
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-2">
                <User className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">About</h3>
                <Button asChild variant="ghost" size="sm" className="ml-auto h-7 text-xs">
                  <Link to="/about">More →</Link>
                </Button>
              </div>
              {about ? (
                <div className="flex items-start gap-4 pt-1">
                  <Avatar className="size-14 border border-border">
                    {about.photoUrl && <AvatarImage src={about.photoUrl} alt={about.title} />}
                    <AvatarFallback className="text-lg">{about.title?.[0] ?? 'C'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h4 className="text-base font-semibold">{about.title}</h4>
                    <p className="text-sm text-muted-foreground">{about.subtitle}</p>
                    {bio && <p className="mt-2 text-sm leading-relaxed text-foreground/80">{bio}</p>}
                  </div>
                </div>
              ) : (
                <Skeleton className="h-20 w-full" />
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-2">
                <Server className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Server</h3>
                <span className="ml-auto flex items-center gap-1.5 text-xs">
                  <span className={cn('size-2 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />
                  <span className="text-muted-foreground">{online ? 'Online' : 'Offline'}</span>
                </span>
              </div>
              {health ? (
                <div className="space-y-3 pt-1">
                  <MetricBar label="Memory" value={mem} icon={MemoryStick} />
                  <MetricBar label="Disk" value={disk} icon={HardDrive} />
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="ml-auto font-medium tabular-nums">{fmtUptime(health.uptime_seconds)}</span>
                  </div>
                </div>
              ) : (
                <Skeleton className="h-24 w-full" />
              )}
            </section>
          </div>

          {/* Recent posts + Categories */}
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
    <div className="space-y-1 py-1">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
