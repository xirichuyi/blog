import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Loader2, Lock, AlertCircle } from 'lucide-react'
import { verifyToken, setToken, isAuthed } from '@/services/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminLogin() {
  const [token, setTok] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from || '/admin'

  if (isAuthed()) {
    navigate('/admin', { replace: true })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = token.trim()
    if (!t || loading) return
    setLoading(true)
    setErr('')
    try {
      const ok = await verifyToken(t)
      if (!ok) {
        setErr('令牌无效，请检查后重试。')
        return
      }
      setToken(t)
      navigate(from, { replace: true })
    } catch {
      setErr('无法连接服务器，请稍后再试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <Helmet>
        <title>登录 · admin</title>
      </Helmet>
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-secondary">
            <Lock className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">后台登录</h1>
            <p className="mt-1 text-sm text-muted-foreground">输入管理令牌（BLOG_ADMIN_TOKEN）</p>
          </div>
        </div>

        <Input
          type="password"
          value={token}
          onChange={(e) => setTok(e.target.value)}
          placeholder="管理令牌"
          autoFocus
          disabled={loading}
          className="h-11"
        />

        {err && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="size-4" /> {err}
          </p>
        )}

        <Button type="submit" disabled={loading || !token.trim()} className="mt-4 h-11 w-full">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> 验证中…
            </>
          ) : (
            '登录'
          )}
        </Button>
      </form>
    </div>
  )
}
