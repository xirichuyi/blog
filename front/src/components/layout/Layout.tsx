import { Link, NavLink, Outlet } from 'react-router-dom'
import { Home, FileText, User, Mail, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/articles', label: 'Articles', icon: FileText },
  { to: '/about', label: 'About', icon: User },
  { to: '/contact', label: 'Contact', icon: Mail },
]

const tip =
  'pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100'
const slot =
  'rounded-2xl p-3 transition-all duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-110 group-hover:bg-accent'

function Dock() {
  const { theme, toggle } = useTheme()
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-end gap-1 rounded-[1.75rem] border border-border bg-background/70 p-2 shadow-xl backdrop-blur-xl">
        {NAV.map((n) => {
          const Icon = n.icon
          return (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="group relative flex flex-col items-center">
              {({ isActive }) => (
                <>
                  <span className={tip}>{n.label}</span>
                  <div className={cn(slot, isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                    <Icon className="size-6" />
                  </div>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 size-1 rounded-full bg-foreground transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </>
              )}
            </NavLink>
          )
        })}

        <span className="mx-1 my-2 w-px self-stretch bg-border" />

        <button onClick={toggle} className="group relative flex flex-col items-center" aria-label="切换主题">
          <span className={tip}>{theme === 'dark' ? '浅色' : '深色'}</span>
          <div className={cn(slot, 'text-muted-foreground group-hover:text-foreground')}>
            {theme === 'dark' ? <Sun className="size-6" /> : <Moon className="size-6" />}
          </div>
        </button>
      </div>
    </div>
  )
}

export function Layout() {
  return (
    <div className="min-h-dvh pb-28">
      {/* Minimal brand, top-left */}
      <Link
        to="/"
        className="fixed left-5 top-5 z-30 text-sm font-semibold tracking-tight text-foreground/90 transition-colors hover:text-foreground"
      >
        chuyi<span className="text-muted-foreground">'s blog</span>
      </Link>

      <main>
        <Outlet />
      </main>

      <Dock />
    </div>
  )
}
