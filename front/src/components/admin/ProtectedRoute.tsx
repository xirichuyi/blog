import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAdminAuth } from '@/lib/admin-auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  const { loading, session } = useAdminAuth()

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-label="正在检查登录状态" />
      </div>
    )
  }
  if (!session) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />
  return <>{children}</>
}
