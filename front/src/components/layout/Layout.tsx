import { Outlet } from 'react-router-dom'
import { Dock } from '@/components/Dock'
import { RouteSEO } from '@/components/SEO'

export function Layout() {
  return (
    <div className="public-shell min-h-dvh pb-28">
      <div className="public-ambience" aria-hidden="true">
        <span className="public-ambience-sage" />
        <span className="public-ambience-amber" />
      </div>
      <RouteSEO />

      <main className="public-content">
        <Outlet />
      </main>

      <div className="site-chrome transition-opacity">
        <Dock />
      </div>
    </div>
  )
}
