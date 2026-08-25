import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { AlertCircle, Loader2 } from 'lucide-react'
import { googleLoginUrl } from '@/services/admin'
import { useAdminAuth } from '@/lib/admin-auth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import './AdminLayout.css'

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
    <div className="admin-shell admin-login-shell">
      <Helmet>
        <title>后台登录 · chuyi's blog</title>
      </Helmet>

      <main className="admin-login-panel">
        <div className="admin-login-mark">初</div>
        <p className="admin-login-kicker">一 隅 书 房</p>
        <h1>回来写字</h1>
        <p className="admin-login-description">使用管理员 Google 账号，进入这间安静的书房。</p>

        {error && (
          <Alert variant="destructive" className="mt-7">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="admin-login-loading">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : (
            <Button asChild variant="outline" className="admin-login-button h-11 w-full">
              <a href={googleLoginUrl()}><GoogleMark /> 使用 Google 账号继续</a>
            </Button>
          )}
        </div>

        <p className="admin-login-note">登录状态仅通过安全 Cookie 保存。</p>
      </main>
    </div>
  )
}
