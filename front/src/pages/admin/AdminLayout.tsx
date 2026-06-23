import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Tags, User, LogOut, ExternalLink } from 'lucide-react'
import { clearToken } from '@/services/admin'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: '概览', icon: LayoutDashboard, end: true },
  { to: '/admin/posts', label: '文章', icon: FileText, end: false },
  { to: '/admin/taxonomy', label: '分类 / 标签', icon: Tags, end: false },
  { to: '/admin/about', label: '关于页', icon: User, end: false },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const logout = () => {
    clearToken()
    navigate('/admin/login', { replace: true })
  }
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border p-4">
        <div className="mb-6 px-2 text-sm font-semibold">
          chuyi <span className="text-muted-foreground">/ admin</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )
              }
            >
              <n.icon className="size-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ExternalLink className="size-4" /> 查看网站
          </a>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <LogOut className="size-4" /> 退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
