import { Outlet } from 'react-router-dom'
import { Dock } from '@/components/Dock'
import { RouteSEO } from '@/components/SEO'

export function Layout() {
  return (
    <div className="min-h-dvh pb-28">
      <RouteSEO />

      <main>
        <Outlet />
      </main>

      <div className="site-chrome transition-opacity">
        <Dock />
      </div>
    </div>
  )
}
