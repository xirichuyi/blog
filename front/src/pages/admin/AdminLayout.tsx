import { useState, type CSSProperties } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChevronUp,
  ExternalLink,
  FileText,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Tags,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { useAdminAuth } from '@/lib/admin-auth'
import { cn } from '@/lib/utils'
import './AdminLayout.css'

const NAV = [
  { to: '/admin', label: '工作台', icon: LayoutDashboard, exact: true },
  { to: '/admin/posts', label: '文章管理', icon: FileText },
  { to: '/admin/taxonomy', label: '分类与标签', icon: Tags },
  { to: '/admin/books', label: '我的书架', icon: BookOpen },
  { to: '/admin/changelog', label: '更新日志', icon: History },
  { to: '/admin/about', label: '关于页面', icon: User },
]

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/admin': { title: '工作台', description: '管理文章与站点内容' },
  '/admin/posts': { title: '文章管理', description: '创作、发布和整理你的文章' },
  '/admin/taxonomy': { title: '分类与标签', description: '让内容保持清晰有序' },
  '/admin/books': { title: '我的书架', description: '管理公开阅读的书籍' },
  '/admin/changelog': { title: '更新日志', description: '记录博客的每一次变化' },
  '/admin/about': { title: '关于页面', description: '维护公开的个人介绍' },
}

function pathIsActive(pathname: string, to: string, exact = false) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
}

export default function AdminLayout() {
  const { session, signOut } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)
  const editingPost = location.pathname === '/admin/posts/new' || /^\/admin\/posts\/\d+$/.test(location.pathname)
  const meta = editingPost
    ? {
        title: location.pathname.endsWith('/new') ? '写文章' : '编辑文章',
        description: '专注写作，完成后再处理发布设置',
      }
    : PAGE_META[location.pathname]
      ?? PAGE_META[NAV.find((item) => pathIsActive(location.pathname, item.to, item.exact))?.to ?? '/admin']

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
    <SidebarProvider className="admin-shell" style={{ '--sidebar-width': '13.5rem' } as CSSProperties}>
      <Sidebar collapsible="offcanvas" className="admin-sidebar">
        <SidebarHeader className="admin-sidebar-header">
          <Link to="/admin" className="admin-brand" aria-label="楚一博客管理后台">
            <span className="admin-brand-mark">楚</span>
            <span className="min-w-0">
              <strong>楚一博客</strong>
              <small>内容管理</small>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup>
            <SidebarGroupLabel className="admin-nav-label">创作与管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      className="admin-nav-item"
                      isActive={pathIsActive(location.pathname, item.to, item.exact)}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="admin-sidebar-footer">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="admin-account">
                    <Avatar className="size-8">
                      <AvatarImage src={session?.picture ?? undefined} alt={session?.name || ''} referrerPolicy="no-referrer" />
                      <AvatarFallback>{session?.name?.slice(0, 1).toUpperCase() || 'A'}</AvatarFallback>
                    </Avatar>
                    <span className="grid min-w-0 flex-1 text-left leading-tight">
                      <span className="truncate text-sm font-medium">{session?.name || '管理员'}</span>
                      <span className="truncate text-xs text-muted-foreground">{session?.email}</span>
                    </span>
                    {signingOut ? <Loader2 className="animate-spin" /> : <ChevronUp />}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-medium">{session?.name || '管理员'}</p>
                    <p className="truncate text-xs text-muted-foreground">{session?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/" target="_blank" rel="noreferrer"><ExternalLink /> 查看博客</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={signingOut} onSelect={() => void logout()}>
                    <LogOut /> 退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="admin-workspace">
        <header className="admin-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0">
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="admin-view-site">
            <a href="/" target="_blank" rel="noreferrer"><ExternalLink /> <span>查看博客</span></a>
          </Button>
        </header>

        <main className="admin-main">
          <div className={cn('admin-container', editingPost && 'admin-container-editor')}>
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <Toaster richColors closeButton />
    </SidebarProvider>
  )
}
