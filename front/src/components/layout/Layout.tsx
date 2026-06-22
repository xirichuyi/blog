import { Link, NavLink, Outlet } from 'react-router-dom'
import { Home, FileText, User, Mail, type LucideIcon } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/articles', label: 'Articles', icon: FileText },
  { to: '/about', label: 'About', icon: User },
  { to: '/contact', label: 'Contact', icon: Mail },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((n) => {
        const Icon = n.icon
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {n.label}
          </NavLink>
        )
      })}
    </>
  )
}

export function Layout() {
  return (
    <div className="min-h-dvh">
      {/* Desktop left sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-background px-4 py-6 md:flex">
        <Link to="/" className="px-2 text-base font-semibold tracking-tight">
          chuyi<span className="text-muted-foreground">'s blog</span>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          <NavItems />
        </nav>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/" className="text-base font-semibold tracking-tight">
          chuyi<span className="text-muted-foreground">'s blog</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2 md:hidden">
        <NavItems />
      </nav>

      {/* Content */}
      <div className="flex min-h-dvh flex-col md:pl-56">
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border">
          <div className="px-6 py-6 text-sm text-muted-foreground sm:px-10">
            © {new Date().getFullYear()} chuyi · Built with React + shadcn/ui
          </div>
        </footer>
      </div>
    </div>
  )
}
