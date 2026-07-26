import { Link, Outlet } from 'react-router-dom'
import { Dock } from '@/components/Dock'
import { RouteSEO } from '@/components/SEO'

export function Layout() {
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

      <main>
        <Outlet />
      </main>

      <div className="site-chrome transition-opacity">
        <Dock />
      </div>
    </div>
  )
}
