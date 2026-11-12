import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, FileText, Wrench, Moon, Sun, BookOpen, MessageCircle, type LucideIcon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/articles', label: 'Articles', icon: FileText },
  { to: '/books', label: 'Books', icon: BookOpen },
  { to: '/projects', label: 'Projects', icon: Wrench },
  { to: '/guestbook', label: 'Guestbook', icon: MessageCircle },
]

const BASE = 36
const MAX = 48
const RANGE = 120 // px proximity falloff

function DockItem({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-dock-part="item"
      style={{ width: BASE, height: BASE }}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="dock-part group/item relative flex shrink-0 items-end justify-center focus-visible:outline-none"
    >
      {/* tooltip */}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover/item:opacity-100 group-focus-visible/item:opacity-100">
        {label}
      </span>
      {/* icon tile — fixed box, scaled from the bottom so it rises above the bar */}
      <span
        style={{ width: BASE, height: BASE }}
        className={cn(
          'dock-tile grid place-items-center rounded-full border border-border/70 group-focus-visible/item:ring-2 group-focus-visible/item:ring-foreground/20 group-focus-visible/item:ring-offset-2 group-focus-visible/item:ring-offset-background [&>svg]:size-[40%]',
          active
            ? 'bg-accent text-accent-foreground'
            : 'bg-background/70 text-muted-foreground group-hover/item:bg-accent group-hover/item:text-accent-foreground'
        )}
      >
        <Icon />
      </span>
      {/* active dot */}
      <span
        className={cn(
          'absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground transition-opacity',
          active ? 'opacity-100' : 'opacity-0'
        )}
      />
    </button>
  )
}

// Icons near the pointer grow and push their neighbours apart. Nothing is
// resized: each part gets a translate, each tile a scale and the bar's
// backdrop a horizontal scale, written as CSS variables when the pointer
// moves. The tween between targets is a CSS transition on transform, so the
// compositor runs it at the display's refresh rate without layout.
export function Dock() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const barRef = useRef<HTMLDivElement>(null)
  const frame = useRef(0)

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  const magnify = (clientX: number | null) => {
    const bar = barRef.current
    if (!bar) return
    const parts = Array.from(bar.querySelectorAll<HTMLElement>('.dock-part'))
    const left = bar.getBoundingClientRect().left
    // offsetLeft/offsetWidth ignore transforms, so these are the resting positions.
    const growth = parts.map((part) => {
      if (clientX === null || part.dataset.dockPart !== 'item') return 0
      const distance = Math.abs(clientX - left - (part.offsetLeft + part.offsetWidth / 2))
      return (MAX - BASE) * Math.max(0, 1 - distance / RANGE)
    })
    const total = growth.reduce((sum, value) => sum + value, 0)
    let before = 0
    parts.forEach((part, index) => {
      // Keep the group centred: everything left of the pointer moves left, the rest right.
      part.style.setProperty('--dock-x', `${before + growth[index] / 2 - total / 2}px`)
      part.style.setProperty('--dock-scale', String(1 + growth[index] / BASE))
      before += growth[index]
    })
    bar.style.setProperty('--dock-stretch', String(1 + total / bar.offsetWidth))
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        ref={barRef}
        onMouseMove={(event) => {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
          const x = event.clientX
          // At most one measurement per frame, however fast the pointer reports.
          cancelAnimationFrame(frame.current)
          frame.current = requestAnimationFrame(() => magnify(x))
        }}
        onMouseLeave={() => {
          cancelAnimationFrame(frame.current)
          magnify(null)
        }}
        className="dock-bar relative flex items-end gap-1.5 px-2.5 pb-1.5 pt-1"
      >
        <span
          aria-hidden="true"
          className="dock-backdrop absolute inset-0 rounded-[1.4rem] border border-border/80 bg-background/72 shadow-[0_12px_40px_hsl(var(--foreground)/0.08)] backdrop-blur-2xl"
        />
        {NAV.map((n) => (
          <DockItem key={n.to} icon={n.icon} label={n.label} active={isActive(n.to)} onClick={() => navigate(n.to)} />
        ))}

        <span data-dock-part="divider" className="dock-part relative mx-1 mb-2 w-px self-stretch bg-border" />

        <DockItem icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Light' : 'Dark'} onClick={toggle} />
      </div>
    </div>
  )
}
