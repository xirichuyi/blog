import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { googleLoginUrl } from '@/services/admin'
import { useAdminAuth } from '@/lib/admin-auth'

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: '服务器还没有配置 Google 登录。',
  access_denied: 'Google 登录已取消。',
  invalid_state: '登录请求已过期，请重新开始。',
  token_exchange: 'Google 暂时无法完成授权，请稍后再试。',
  user_info: '无法读取 Google 账号信息，请稍后再试。',
  unverified_email: '该 Google 账号的邮箱尚未验证。',
  account_not_allowed: '这个 Google 账号不在后台管理员白名单中。',
  session_failed: '登录成功，但无法建立后台会话。',
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.796 2.715v2.258h2.909c1.702-1.567 2.683-3.875 2.683-6.614Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.008-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.582C13.463.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.008 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
    </svg>
  )
}

export default function AdminLogin() {
  const { loading, session } = useAdminAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = (location.state as { from?: string } | null)?.from || '/admin'
  const errorCode = searchParams.get('error')
  const error = errorCode ? ERROR_MESSAGES[errorCode] || 'Google 登录失败，请重新尝试。' : ''

  if (!loading && session) return <Navigate to={from} replace />

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 text-foreground">
      <Helmet>
        <title>后台登录 · chuyi's blog</title>
      </Helmet>

      <main className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-border bg-secondary/60">
            <ShieldCheck className="size-5" />
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            chuyi / admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">登录博客后台</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            使用已加入管理员白名单的 Google 账号。
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex h-12 items-center justify-center rounded-xl border border-border text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <a
            href={googleLoginUrl()}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <GoogleMark />
            使用 Google 账号继续
          </a>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          登录状态通过安全 Cookie 保存，不会在浏览器中存储管理令牌。
        </p>
      </main>
    </div>
  )
}
