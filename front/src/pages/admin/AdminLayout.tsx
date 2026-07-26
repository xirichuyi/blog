import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Tags,
  User,
} from 'lucide-react'
import { useAdminAuth } from '@/lib/admin-auth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: '概览', icon: LayoutDashboard, end: true },
  { to: '/admin/posts', label: '文章', icon: FileText, end: false },
  { to: '/admin/taxonomy', label: '分类', icon: Tags, end: false },
  { to: '/admin/about', label: '关于', icon: User, end: false },
]

function AdminNav({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={mobile ? 'grid grid-cols-4' : 'flex flex-col gap-1'}>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              mobile
                ? 'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px]'
                : 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? mobile
                  ? 'text-foreground'
                  : 'bg-accent font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          <item.icon className={mobile ? 'size-5' : 'size-4'} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AdminLayout() {
  const { session, signOut } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)
  const editingPost =
    location.pathname === '/admin/posts/new'
    || /^\/admin\/posts\/\d+$/.test(location.pathname)

  const logout = async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/admin/login', { replace: true })
    } catch (error) {
      window.alert((error as Error).message || '退出失败，请稍后重试。')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border p-4 md:flex">
        <div className="mb-6 px-2 text-sm font-semibold">
          chuyi <span className="text-muted-foreground">/ admin</span>
        </div>
        <AdminNav />

        <div className="mt-auto border-t border-border pt-3">
          {session && (
            <div className="mb-3 flex items-center gap-2 px-2">
              {session.picture ? (
                <img
                  src={session.picture}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-8 rounded-full"
                />
              ) : (
                <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-medium">
                  {session.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{session.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
              </div>
            </div>
          )}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ExternalLink className="size-4" /> 查看网站
          </a>
          <button
            type="button"
            onClick={logout}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:opacity-50"
          >
            {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            退出登录
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <span className="text-sm font-semibold">
            chuyi <span className="text-muted-foreground">/ admin</span>
          </span>
          <div className="flex items-center gap-1">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="查看网站"
            >
              <ExternalLink className="size-4" />
            </a>
            <button
              type="button"
              onClick={logout}
              disabled={signingOut}
              className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
              aria-label="退出登录"
            >
              {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            </button>
          </div>
        </header>

        <main>
          <div
            className={cn(
              'mx-auto max-w-4xl px-4 py-5 sm:px-6 md:px-8 md:py-10 md:pb-10',
              editingPost ? 'pb-8' : 'pb-28',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {!editingPost && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <AdminNav mobile />
        </div>
      )}
    </div>
  )
}
