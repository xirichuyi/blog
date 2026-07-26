import { Link, Outlet, useLocation } from 'react-router-dom'
import { Dock } from '@/components/Dock'
import { RouteSEO } from '@/components/SEO'

export function Layout() {
  const location = useLocation()
  return (
    <div className="min-h-dvh pb-28">
      <RouteSEO />
      {/* Minimal brand, top-left */}
      <Link
        to="/"
        className="site-chrome fixed left-5 top-5 z-30 text-sm font-semibold tracking-tight text-foreground/90 transition-all hover:text-foreground"
      >
        chuyi<span className="text-muted-foreground">'s blog</span>
      </Link>

      {/* keyed by route → subtle fade-up transition on every navigation */}
      <main key={location.pathname} className="duration-500 animate-in fade-in slide-in-from-bottom-2">
        <Outlet />
      </main>

      <div className="site-chrome transition-opacity">
        <Dock />
      </div>
    </div>
  )
}
