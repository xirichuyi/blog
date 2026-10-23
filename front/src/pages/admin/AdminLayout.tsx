import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  PanelsTopLeft,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Toaster } from '@/components/ui/sonner'
import { useAdminAuth } from '@/lib/admin-auth'
import { cn } from '@/lib/utils'
import './AdminLayout.css'

interface SubPage {
  to: string
  label: string
  title: string
  description: string
}

interface Section {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
  pages: SubPage[]
}

// Four destinations; sections with several pages switch between them with tabs.
const SECTIONS: Section[] = [
  {
    to: '/admin',
    label: '概览',
    icon: LayoutDashboard,
    exact: true,
    pages: [{ to: '/admin', label: '概览', title: '概览', description: '内容、访问与站点状态' }],
  },
  {
    to: '/admin/posts',
    label: '文章',
    icon: FileText,
    pages: [
      { to: '/admin/posts', label: '全部文章', title: '文章', description: '创作、发布和整理你的文章' },
      { to: '/admin/posts/taxonomy', label: '分类与标签', title: '文章', description: '整理文章使用的分类和标签' },
    ],
  },
  {
    to: '/admin/books',
    label: '书架',
    icon: BookOpen,
    pages: [{ to: '/admin/books', label: '书架', title: '书架', description: '管理公开阅读的书籍' }],
  },
  {
    to: '/admin/site',
    label: '站点',
    icon: PanelsTopLeft,
    pages: [
      { to: '/admin/site', label: '关于页面', title: '站点', description: '维护公开的个人介绍' },
      { to: '/admin/site/changelog', label: '更新日志', title: '站点', description: '记录博客的每一次变化' },
    ],
  },
]

function sectionFor(pathname: string): Section {
  return [...SECTIONS].reverse().find((section) => (
    section.exact ? pathname === section.to : pathname === section.to || pathname.startsWith(`${section.to}/`)
  )) ?? SECTIONS[0]
}

function SectionLink({ section, className }: { section: Section; className: string }) {
  const Icon = section.icon
  return (
    <NavLink
      to={section.to}
      end={section.exact}
      className={({ isActive }) => cn(className, isActive && 'is-active')}
    >
      <Icon aria-hidden="true" />
      <span>{section.label}</span>
    </NavLink>
  )
}

function AccountMenu({ side, className, avatarClassName }: { side: 'right' | 'bottom'; className: string; avatarClassName: string }) {
  const { session, signOut } = useAdminAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const logout = async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/admin/login', { replace: true })
    } catch (error) {
      toast.error((error as Error).message || '退出失败，请稍后重试。')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={className} aria-label="管理员账户">
          <Avatar className={avatarClassName}>
            <AvatarImage src={session?.picture ?? undefined} alt={session?.name || ''} referrerPolicy="no-referrer" />
            <AvatarFallback>{session?.name?.slice(0, 1).toUpperCase() || 'A'}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{session?.name || '管理员'}</p>
          <p className="truncate text-xs text-muted-foreground">{session?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/" target="_blank" rel="noreferrer"><ArrowUpRight /> 返回博客</a>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={signingOut} onSelect={() => void logout()}>
          {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} 退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AdminLayout() {
  const location = useLocation()
  const editingPost = location.pathname === '/admin/posts/new' || /^\/admin\/posts\/\d+$/.test(location.pathname)
  const section = sectionFor(location.pathname)
  const page = section.pages.find((item) => item.to === location.pathname) ?? section.pages[0]

  // The editor is a full-screen writing view with its own action bar.
  if (editingPost) {
    return (
      <div className="admin-shell">
        <Outlet />
        <Toaster richColors closeButton />
      </div>
    )
  }

  return (
    <div className="admin-shell admin-console">
      <nav className="admin-rail" aria-label="后台导航">
        <div className="admin-rail-items">
          {SECTIONS.map((item) => <SectionLink key={item.to} section={item} className="admin-rail-item" />)}
        </div>
        <div className="admin-rail-footer">
          <a href="/" target="_blank" rel="noreferrer" className="admin-rail-item">
            <ArrowUpRight aria-hidden="true" />
            <span>博客</span>
          </a>
          <AccountMenu side="right" className="admin-rail-account" avatarClassName="size-8" />
        </div>
      </nav>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-row">
            <div className="min-w-0">
              <h1>{page.title}</h1>
              <p>{page.description}</p>
            </div>
            <AccountMenu side="bottom" className="admin-topbar-account" avatarClassName="size-7" />
          </div>
          {section.pages.length > 1 && (
            <nav className="admin-subtabs" aria-label={`${section.label}页面`}>
              {section.pages.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) => cn('admin-subtab', isActive && 'is-active')}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        <main className="admin-main">
          <div className="admin-container">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="admin-tabbar" aria-label="后台导航">
        {SECTIONS.map((item) => <SectionLink key={item.to} section={item} className="admin-tabbar-item" />)}
      </nav>
      <Toaster richColors closeButton />
    </div>
  )
}
