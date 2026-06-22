import { Link, NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/articles', label: 'Articles' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="text-base font-semibold tracking-tight">
            chuyi<span className="text-muted-foreground">'s blog</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="container flex h-16 flex-col items-center justify-between gap-1 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} chuyi. All rights reserved.</span>
          <span>Built with React + shadcn/ui</span>
        </div>
      </footer>
    </div>
  )
}
