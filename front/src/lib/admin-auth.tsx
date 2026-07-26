import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ADMIN_AUTH_EXPIRED_EVENT,
  getAdminSession,
  logoutAdmin,
  type AdminSession,
} from '@/services/admin'

interface AdminAuthState {
  loading: boolean
  session: AdminSession | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthState | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<AdminSession | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setSession(await getAdminSession())
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await logoutAdmin()
    setSession(null)
  }, [])

  useEffect(() => {
    refresh().catch(() => {
      setSession(null)
      setLoading(false)
    })
  }, [refresh])

  useEffect(() => {
    const expire = () => setSession(null)
    window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, expire)
  }, [])

  const value = useMemo(
    () => ({ loading, session, refresh, signOut }),
    [loading, refresh, session, signOut],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthState {
  const value = useContext(AdminAuthContext)
  if (!value) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return value
}
