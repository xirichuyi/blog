import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  MoreVertical,
  Tags,
  User,
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
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { useAdminAuth } from '@/lib/admin-auth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: '概览', icon: LayoutDashboard, exact: true },
  { to: '/admin/posts', label: '文章', icon: FileText },
  { to: '/admin/taxonomy', label: '分类与标签', icon: Tags },
  { to: '/admin/about', label: '关于页', icon: User },
]

function pathIsActive(pathname: string, to: string, exact = false) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
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
      toast.error((error as Error).message || '退出失败，请稍后重试。')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="chuyi / admin">
                <Link to="/admin">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                    C
                  </span>
                  <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">chuyi</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">博客后台</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathIsActive(location.pathname, item.to, item.exact)}
                      tooltip={item.label}
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

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={session?.name || '账号'}>
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={session?.picture ?? undefined} alt={session?.name || ''} referrerPolicy="no-referrer" />
                      <AvatarFallback className="rounded-lg">
                        {session?.name?.slice(0, 1).toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{session?.name || '管理员'}</span>
                      <span className="truncate text-xs text-sidebar-foreground/60">{session?.email}</span>
                    </span>
                    {signingOut ? <Loader2 className="animate-spin" /> : <MoreVertical />}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-medium">{session?.name || '管理员'}</p>
                    <p className="truncate text-xs text-muted-foreground">{session?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/" target="_blank" rel="noreferrer">
                      <ExternalLink /> 查看网站
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={signingOut} onSelect={() => void logout()}>
                    <LogOut /> 退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium md:hidden">博客后台</span>
        </header>
        <main className="flex-1">
          <div
            className={cn(
              'mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-10',
              editingPost ? 'max-w-[1500px]' : 'max-w-5xl',
            )}
          >
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <Toaster richColors closeButton />
    </SidebarProvider>
  )
}
