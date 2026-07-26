import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface SiteUI {
  zen: boolean
  toggleZen: () => void
  exitZen: () => void
}

const SiteUIContext = createContext<SiteUI | null>(null)

export function SiteUIProvider({ children }: { children: ReactNode }) {
  const [zen, setZen] = useState(false)
  const toggleZen = useCallback(() => setZen((value) => !value), [])
  const exitZen = useCallback(() => setZen(false), [])

  useEffect(() => {
    document.documentElement.toggleAttribute('data-zen', zen)
    return () => document.documentElement.removeAttribute('data-zen')
  }, [zen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setZen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo<SiteUI>(
    () => ({
      zen,
      toggleZen,
      exitZen,
    }),
    [exitZen, toggleZen, zen],
  )

  return <SiteUIContext.Provider value={value}>{children}</SiteUIContext.Provider>
}

export function useSiteUI(): SiteUI {
  const value = useContext(SiteUIContext)
  if (!value) throw new Error('useSiteUI must be used inside SiteUIProvider')
  return value
}
