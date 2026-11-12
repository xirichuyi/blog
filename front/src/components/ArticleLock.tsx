import { useState, type FormEvent } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { unlockArticle, type Article } from '@/services/api'
import { ApiError } from '@/services/http'

/** Shown in place of the body of a password-protected article. */
export function ArticleLock({ articleId, onUnlocked }: { articleId: string; onUnlocked: (article: Article) => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    try {
      onUnlocked(await unlockArticle(articleId, password))
    } catch (unlockError) {
      setError(
        unlockError instanceof ApiError && (unlockError.status === 401 || unlockError.status === 429)
          ? unlockError.message
          : '解锁失败，请稍后再试',
      )
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col items-center py-10 text-center" aria-labelledby="article-lock-title">
      <span className="grid size-12 place-items-center rounded-full border border-border/70 bg-secondary/60 text-muted-foreground">
        <Lock className="size-5" aria-hidden="true" />
      </span>
      <h2 id="article-lock-title" className="mt-5 text-base font-medium">这篇文章已加密</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">输入访问密码后即可阅读全文。</p>
      <form onSubmit={submit} className="mt-6 flex w-full gap-2">
        <Input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setError('')
          }}
          placeholder="访问密码"
          aria-label="访问密码"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'article-lock-error' : undefined}
          autoComplete="off"
          autoFocus
        />
        <Button type="submit" disabled={!password || busy} className="shrink-0">
          {busy && <Loader2 className="animate-spin" />} 解锁
        </Button>
      </form>
      {error && (
        <p id="article-lock-error" role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
