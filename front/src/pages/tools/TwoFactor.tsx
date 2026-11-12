import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Check, Copy, ImageUp, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { decodeQrImage } from '@/lib/qr-image'
import { parseOtpInput, secondsRemaining, totp, type OtpAccount } from '@/lib/totp'
import { cn } from '@/lib/utils'

interface Entry extends OtpAccount {
  id: number
  /** Identifies the same secret and settings, so nothing is listed twice. */
  fingerprint: string
}

function fingerprint(account: OtpAccount): string {
  return [Array.from(account.secret).join('.'), account.algorithm, account.digits, account.period].join('|')
}

function grouped(code: string): string {
  const half = Math.ceil(code.length / 2)
  return `${code.slice(0, half)} ${code.slice(half)}`
}

function CodeCard({ entry, code, now, onRemove }: { entry: Entry; code?: string; now: number; onRemove: () => void }) {
  const [copied, setCopied] = useState(false)
  const remaining = secondsRemaining(entry, now)
  const expiring = remaining <= 5

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch { /* Clipboard blocked: the code is still on screen to type by hand. */ }
  }

  return (
    <li className="rounded-xl border border-border/70 bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-muted-foreground">{entry.label || '未命名密钥'}</p>
        <button
          type="button"
          onClick={onRemove}
          className="-m-1 shrink-0 rounded p-1 text-muted-foreground/70 transition-colors hover:text-destructive"
          aria-label={`移除 ${entry.label || '未命名密钥'}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        disabled={!code}
        className="group mt-2 flex w-full items-center justify-between gap-3 text-left"
        aria-label={code ? `复制验证码 ${code}` : '正在计算验证码'}
      >
        <span className={cn('font-mono text-3xl font-semibold tabular-nums tracking-wider', expiring && 'text-amber-600 dark:text-amber-500')}>
          {code ? grouped(code) : '··· ···'}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
          {copied ? <><Check className="size-3.5 text-emerald-500" /> 已复制</> : <><Copy className="size-3.5" /> 复制</>}
        </span>
      </button>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <div
            className={cn('h-full rounded-full transition-[width] duration-500 ease-linear', expiring ? 'bg-amber-500' : 'bg-primary/70')}
            style={{ width: `${(remaining / entry.period) * 100}%` }}
          />
        </div>
        <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{remaining}s</span>
      </div>
    </li>
  )
}

// Browser-only 2FA code generator linked from Projects.
export default function TwoFactor() {
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [codes, setCodes] = useState<Record<number, string>>({})
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(1)
  const supported = typeof crypto !== 'undefined' && Boolean(crypto.subtle)

  const addFromText = useCallback((text: string): boolean => {
    try {
      const accounts = parseOtpInput(text)
      setEntries((current) => {
        const next = [...current]
        const added: Entry[] = []
        for (const account of accounts) {
          const key = fingerprint(account)
          const index = [...added, ...next].findIndex((entry) => entry.fingerprint === key)
          if (index < 0) {
            added.push({ ...account, id: nextId.current++, fingerprint: key })
            continue
          }
          // Already listed: a QR code scanned later can still supply the missing name.
          const existing = index - added.length
          if (existing >= 0 && !next[existing].label && account.label) {
            next[existing] = { ...next[existing], label: account.label }
          }
        }
        return [...added, ...next]
      })
      setError('')
      return true
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : '无法识别这段内容')
      return false
    }
  }, [])

  const addFromImage = useCallback(async (image: Blob) => {
    setReading(true)
    setError('')
    try {
      const text = await decodeQrImage(image)
      if (text === null) setError('没有在图片里找到二维码，换一张更清晰或裁剪过的截图试试')
      else if (!/^otpauth(-migration)?:\/\//i.test(text.trim())) setError('这张二维码不是 2FA 密钥（内容不是 otpauth 链接）')
      else addFromText(text.trim())
    } catch {
      setError('图片无法读取，请换一张 PNG 或 JPG')
    } finally {
      setReading(false)
    }
  }, [addFromText])

  // Paste anywhere on the page: an image is scanned as a QR code, and text
  // pasted outside the input box is added straight away.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const image = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith('image/'))
      if (image) {
        event.preventDefault()
        void addFromImage(image)
        return
      }
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      const text = event.clipboardData?.getData('text/plain').trim()
      if (text) {
        event.preventDefault()
        addFromText(text)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFromImage, addFromText])

  useEffect(() => {
    if (entries.length === 0) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    setNow(Date.now())
    return () => window.clearInterval(timer)
  }, [entries.length])

  // Codes only change when an account crosses into its next time step.
  const steps = useMemo(
    () => entries.map((entry) => `${entry.id}:${Math.floor(now / 1000 / entry.period)}`).join(','),
    [entries, now],
  )
  const latest = useRef({ entries, now })
  latest.current = { entries, now }
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    const { entries: accounts, now: time } = latest.current
    Promise.all(accounts.map(async (entry) => [entry.id, await totp(entry, time)] as const))
      .then((pairs) => { if (!cancelled) setCodes(Object.fromEntries(pairs)) })
      .catch(() => { if (!cancelled) setError('验证码计算失败，请检查密钥是否正确') })
    return () => { cancelled = true }
  }, [steps, supported])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (addFromText(input)) setInput('')
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
      <Helmet>
        <title>2FA 验证码 · chuyi's blog</title>
      </Helmet>

      <Link
        to="/projects"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Projects
      </Link>

      <header className="mb-8">
        <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
          <KeyRound className="size-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">2FA 验证码</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          填入 2FA 密钥，或直接粘贴二维码截图，立即得到当前的动态验证码。全部在浏览器里计算，密钥不会上传，也不会保存。
        </p>
      </header>

      {!supported && (
        <p className="mb-4 inline-flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> 当前浏览器环境不支持 Web Crypto（需要通过 HTTPS 访问），无法计算验证码。
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Textarea
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
            setError('')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          rows={2}
          placeholder="密钥（如 JBSW Y3DP EHPK 3PXP）或 otpauth:// 链接"
          aria-label="2FA 密钥或 otpauth 链接"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-0 resize-none font-mono text-sm"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={!input.trim() || !supported} className="h-11 sm:flex-1">
            <KeyRound className="size-4" /> 获取验证码
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 sm:flex-1"
            disabled={reading || !supported}
            onClick={() => fileInputRef.current?.click()}
          >
            {reading ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
            {reading ? '识别中…' : '选择二维码图片'}
          </Button>
        </div>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void addFromImage(file)
          event.target.value = ''
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith('image/'))
          if (file) void addFromImage(file)
          else setError('请拖入一张图片')
        }}
        className={cn(
          'mt-3 rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground transition-colors',
          dragging ? 'border-primary/60 bg-primary/5 text-foreground' : 'border-border',
        )}
      >
        在此页面按 <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs">Ctrl/⌘ + V</kbd> 粘贴二维码截图，或把图片拖到这里
      </div>

      <div className="mt-4 min-h-5 text-sm" aria-live="polite">
        {error && (
          <p className="inline-flex items-start gap-1.5 text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
      </div>

      {entries.length > 0 && (
        <section className="mt-4" aria-label="验证码">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{entries.length} 个密钥</span>
            {entries.length > 1 && (
              <button type="button" className="transition-colors hover:text-destructive" onClick={() => setEntries([])}>
                全部清除
              </button>
            )}
          </div>
          <ul className="space-y-3">
            {entries.map((entry) => (
              <CodeCard
                key={entry.id}
                entry={entry}
                code={codes[entry.id]}
                now={now}
                onRemove={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}
              />
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12 space-y-2 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground/80">说明。</span>{' '}
          支持 Base32 密钥、otpauth://totp 链接、绑定页面的二维码，以及 Google Authenticator「转移账号」导出的二维码（可一次导入多个）。
        </p>
        <p>验证码按本机时间计算；如果总是提示错误，先检查设备时间是否准确。密钥只留在这个标签页的内存里，刷新或关闭页面即清空。</p>
      </div>
    </div>
  )
}
