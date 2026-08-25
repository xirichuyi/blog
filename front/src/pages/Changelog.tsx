import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import { SEO } from '@/components/SEO'
import { listChangelog, type ChangelogEntry } from '@/services/api'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listChangelog().then(setEntries).catch((loadError) => setError((loadError as Error).message))
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <SEO title="更新日志" description="记录楚一博客的设计、内容与功能变化。" path="/changelog" />
      <header className="public-page-head">
        <p className="literary-kicker">CHANGELOG · 年轮</p>
        <h1>缓慢生长</h1>
        <p>一份安静的记录：这个博客如何在时间里一点点变化。</p>
      </header>

      {!entries && !error && <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> 正在翻阅记录…</div>}
      {error && <p className="py-8 text-sm text-destructive">暂时无法读取更新日志：{error}</p>}
      {entries?.length === 0 && <p className="py-12 text-sm text-muted-foreground">还没有留下记录。</p>}
      <div className="relative space-y-12 before:absolute before:bottom-0 before:left-[5px] before:top-2 before:w-px before:bg-border">
        {entries?.map((entry) => (
          <article key={entry.id} className="relative pl-8">
            <span className="absolute left-0 top-2 size-[11px] rounded-full border-2 border-background bg-primary" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <time className="text-xs text-muted-foreground">{formatDate(entry.published_at)}</time>
              {entry.version && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">{entry.version}</span>}
            </div>
            <h2 className="mt-2 font-[var(--font-literary)] text-xl font-semibold tracking-wide">{entry.title}</h2>
            <div className="mt-4 text-sm"><Markdown content={entry.content} /></div>
          </article>
        ))}
      </div>
    </div>
  )
}
