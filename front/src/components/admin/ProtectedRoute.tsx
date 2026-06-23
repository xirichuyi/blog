import { Navigate, useLocation } from 'react-router-dom'
import { isAuthed } from '@/services/admin'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  if (!isAuthed()) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />
  return <>{children}</>
}
