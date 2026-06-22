import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { gitbook2epub } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; filename: string }
  | { kind: 'error'; message: string }

export default function Gitbook2Epub() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const loading = status.kind === 'loading'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const target = url.trim()
    if (!target || loading) return
    setStatus({ kind: 'loading' })
    try {
      const { blob, filename } = await gitbook2epub(target)
      // Trigger a browser download from the returned blob.
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
      setStatus({ kind: 'done', filename })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
      <Helmet>
        <title>GitBook → EPUB · chuyi's blog</title>
      </Helmet>

      <Link
        to="/projects"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Projects
      </Link>

      <header className="mb-8">
        <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
          <BookOpen className="size-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">GitBook → EPUB</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Paste the link of an online book (GitBook, bookdown, GitHub Pages docs…) and get a clean
          EPUB you can read offline.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.gitbook.io/my-book"
          required
          disabled={loading}
          className="h-11 flex-1"
        />
        <Button type="submit" disabled={loading || !url.trim()} className="h-11 shrink-0">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Converting…
            </>
          ) : (
            <>
              <Download className="size-4" /> Convert
            </>
          )}
        </Button>
      </form>

      {/* Status line */}
      <div className="mt-4 min-h-5 text-sm">
        {status.kind === 'loading' && (
          <p className="text-muted-foreground">
            Crawling the book and building the EPUB — this can take up to ~90&nbsp;seconds for larger
            books. Keep this tab open.
          </p>
        )}
        {status.kind === 'done' && (
          <p className="inline-flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="size-4" /> Done — <span className="font-medium">{status.filename}</span> downloaded.
          </p>
        )}
        {status.kind === 'error' && (
          <p className="inline-flex items-start gap-1.5 text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {status.message}
          </p>
        )}
      </div>

      <div className="mt-12 space-y-2 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground/80">Tips.</span> Works best with static online
          books. One conversion runs at a time; if it's busy, try again in a moment.
        </p>
        <p>The link must be a public http/https address. Private and internal addresses are rejected.</p>
      </div>
    </div>
  )
}
