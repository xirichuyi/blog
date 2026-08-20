import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import { SEO } from '@/components/SEO'
import { listChangelog, type ChangelogEntry } from '@/services/api'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listChangelog().then(setEntries).catch((loadError) => setError((loadError as Error).message))
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <SEO title="Changelog" description="Product updates and design changes across chuyi's blog." path="/changelog" />
      <header className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Build in public</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Changelog</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">A quiet record of how this blog evolves over time.</p>
      </header>

      {!entries && !error && <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading changelog…</div>}
      {error && <p className="py-8 text-sm text-destructive">Could not load the changelog: {error}</p>}
      {entries?.length === 0 && <p className="py-12 text-sm text-muted-foreground">No entries yet.</p>}
      <div className="relative space-y-12 before:absolute before:bottom-0 before:left-[5px] before:top-2 before:w-px before:bg-border">
        {entries?.map((entry) => (
          <article key={entry.id} className="relative pl-8">
            <span className="absolute left-0 top-2 size-[11px] rounded-full border-2 border-background bg-foreground" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <time className="text-xs text-muted-foreground">{formatDate(entry.published_at)}</time>
              {entry.version && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">{entry.version}</span>}
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">{entry.title}</h2>
            <div className="mt-4 text-sm"><Markdown content={entry.content} /></div>
          </article>
        ))}
      </div>
    </div>
  )
}
