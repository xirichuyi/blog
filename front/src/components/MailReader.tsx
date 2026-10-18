import { useState } from 'react'
import { Loader2, Mail, ChevronDown, ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  fetchMailList,
  fetchMailBody,
  parseCombo,
  type MailCreds,
  type MailSummary,
  type MailBody,
} from '@/services/mail'

// IMAP requests are relayed by the backend without persisting credentials.
function fmtDate(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MailReader() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<MailSummary[] | null>(null)
  // 解析后的凭据（可能来自「邮箱+密码」或商家给的整串），用于后续拉正文。
  const [creds, setCreds] = useState<MailCreds | null>(null)

  // 当前展开的邮件 uid → 正文（缓存在本次会话里，避免重复请求）。
  const [openUid, setOpenUid] = useState<number | null>(null)
  const [bodyCache, setBodyCache] = useState<Record<number, MailBody>>({})
  const [bodyLoading, setBodyLoading] = useState(false)
  const [bodyError, setBodyError] = useState('')

  // 把两个输入框合成一份凭据：任一框粘进了「邮箱----密码----refresh_token----client_id」
  // 整串，就按整串解析；否则按「邮箱 + 应用专用密码」处理。
  function resolveCreds(): MailCreds | null {
    const combo = parseCombo(token) || parseCombo(email)
    if (combo) return combo
    if (!email.trim() || !token.trim()) return null
    return { email: email.trim(), token }
  }

  async function onLoad(e: React.FormEvent) {
    e.preventDefault()
    const c = resolveCreds()
    if (!c) return
    setLoading(true)
    setError('')
    setMessages(null)
    setOpenUid(null)
    setBodyCache({})
    setCreds(c)
    try {
      const res = await fetchMailList(c, 20)
      setMessages(res.messages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  async function onToggle(uid: number | null) {
    if (uid == null) return
    if (openUid === uid) {
      setOpenUid(null)
      return
    }
    setOpenUid(uid)
    setBodyError('')
    if (bodyCache[uid]) return
    if (!creds) return
    setBodyLoading(true)
    try {
      const body = await fetchMailBody(creds, uid)
      setBodyCache((m) => ({ ...m, [uid]: body }))
    } catch (err) {
      setBodyError(err instanceof Error ? err.message : 'Failed to load the message')
    } finally {
      setBodyLoading(false)
    }
  }

  function reset() {
    setMessages(null)
    setError('')
    setOpenUid(null)
    setBodyCache({})
    setCreds(null)
  }

  return (
    <div>
      {!messages && (
        <form onSubmit={onLoad} className="flex flex-col gap-3 rounded-xl border border-border/60 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mail-email" className="text-xs text-muted-foreground">
              Email address
            </Label>
            <Input
              id="mail-email"
              type="email"
              autoComplete="off"
              placeholder="you@yahoo.com / @gmail.com / @qq.com …"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mail-token" className="text-xs text-muted-foreground">
              App password · or paste a full Outlook string
            </Label>
            <Input
              id="mail-token"
              type="password"
              autoComplete="off"
              placeholder="App password, or email----password----refresh_token----client_id"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading || !resolveCreds()} className="mt-1 w-full">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            {loading ? 'Loading…' : 'Read mail'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Supports Yahoo, Gmail, iCloud, QQ, 163, 126, and more. Outlook/Hotmail personal
              accounts no longer accept passwords — paste the full{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                email----password----refresh_token----client_id
              </code>{' '}
              string instead. Credentials are used once and never stored.
            </span>
          </p>
        </form>
      )}

      {messages && (
        <div>
          <button
            onClick={reset}
            className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back · Start over
          </button>

          {messages.length === 0 && <p className="py-6 text-sm text-muted-foreground">The inbox is empty.</p>}

          <div className="flex flex-col">
            {messages.map((m) => {
              const uid = m.uid ?? -1
              const isOpen = openUid === uid
              const body = uid >= 0 ? bodyCache[uid] : undefined
              return (
                <div key={uid} className="border-b border-border/40 last:border-0">
                  <button
                    onClick={() => onToggle(m.uid)}
                    className="group flex w-full items-start gap-2 rounded-lg px-2 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <ChevronDown
                      className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] text-muted-foreground">{m.from || '(Unknown sender)'}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {fmtDate(m.internalDate || m.date)}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[15px] font-medium text-foreground">
                        {m.subject || '(No subject)'}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-2 pb-4">
                      {bodyLoading && !body && (
                        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" /> Loading message…
                        </div>
                      )}
                      {bodyError && !body && <p className="py-3 text-sm text-destructive">{bodyError}</p>}
                      {body &&
                        (body.html ? (
                          // 邮件 HTML 放进完全隔离的 iframe：sandbox 不含 allow-scripts /
                          // allow-same-origin，等于禁掉脚本与同源访问，防 XSS。
                          <iframe
                            title="Message body"
                            sandbox=""
                            srcDoc={body.html}
                            className="h-[420px] w-full rounded-lg border border-border/60 bg-white"
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-muted/40 p-3 text-[13px] leading-relaxed text-foreground">
                            {body.text || '(Empty message)'}
                          </pre>
                        ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
