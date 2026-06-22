import { Link, Outlet } from 'react-router-dom'
import { Dock } from '@/components/Dock'

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
