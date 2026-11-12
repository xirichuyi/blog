import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/** Each history entry owns its position; new destinations start at the top. */
export function RouteScroll() {
  const location = useLocation()
  const navigation = useNavigationType()
  const positions = useRef(new Map<string, { x: number; y: number }>())

  useLayoutEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => { history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    const key = location.key
    const target = navigation === 'POP' ? positions.current.get(key) : undefined
    let restoring = Boolean(target || location.hash)
    let observer: ResizeObserver | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const record = () => {
      if (!restoring) positions.current.set(key, { x: window.scrollX, y: window.scrollY })
    }
    const restore = () => {
      if (location.hash) {
        let id = location.hash.slice(1)
        try { id = decodeURIComponent(id) } catch { /* Use the literal fragment. */ }
        const anchor = document.getElementById(id)
        if (anchor) { anchor.scrollIntoView({ behavior: 'instant' }); return }
      }
      window.scrollTo({ left: target?.x ?? 0, top: target?.y ?? 0, behavior: 'instant' })
    }
    const stop = () => {
      restoring = false
      observer?.disconnect()
      clearTimeout(timer)
      record()
    }
    restore()
    // Lazy routes, API results and images can grow after the initial commit.
    if (restoring) {
      observer = new ResizeObserver(restore)
      observer.observe(document.body)
      timer = setTimeout(stop, 5000)
    } else record()
    window.addEventListener('scroll', record, { passive: true })
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    return () => {
      observer?.disconnect()
      clearTimeout(timer)
      window.removeEventListener('scroll', record)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [location.key, location.hash, navigation])
  return null
}
