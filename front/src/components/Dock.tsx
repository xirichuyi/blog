import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cancelFrame, frame, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Home, FileText, Wrench, Moon, Sun, BookOpen, MessageCircle, type LucideIcon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { dockCenters } from '@/lib/dock-layout'

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

type DockPointer = { x: number; centers: number[] }

function DockItem({
  pointer,
  index,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  pointer: MotionValue<DockPointer>
  index: number
  icon: LucideIcon
  label: string
  active?: boolean
  onClick: () => void
}) {
  const distance = useTransform(pointer, ({ x, centers }) => x - (centers[index] ?? 0))
  const widthTarget = useTransform(distance, [-RANGE, 0, RANGE], [BASE, MAX, BASE])
  const width = useSpring(widthTarget, { mass: 0.1, stiffness: 170, damping: 14 })
  // Icon scales from the bottom — the bar's height stays fixed; magnified
  // icons rise above the bar and push neighbours apart horizontally.
  const scale = useTransform(width, [BASE, MAX], [1, MAX / BASE])

  return (
    <motion.button
      data-dock-item
      type="button"
      style={{ width, height: BASE }}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="group/item relative flex shrink-0 items-end justify-center focus-visible:outline-none"
    >
      {/* tooltip */}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover/item:opacity-100 group-focus-visible/item:opacity-100">
        {label}
      </span>
      {/* icon tile — fixed box, scaled via transform from the bottom */}
      <motion.span
        style={{ width: BASE, height: BASE, scale, transformOrigin: 'bottom center' }}
        className={cn(
          'grid place-items-center rounded-full border border-border/70 transition-colors group-focus-visible/item:ring-2 group-focus-visible/item:ring-foreground/20 group-focus-visible/item:ring-offset-2 group-focus-visible/item:ring-offset-background [&>svg]:size-[40%]',
          active
            ? 'bg-accent text-accent-foreground'
            : 'bg-background/70 text-muted-foreground group-hover/item:bg-accent group-hover/item:text-accent-foreground'
        )}
      >
        <Icon />
      </motion.span>
      {/* active dot */}
      <span
        className={cn(
          'absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground transition-opacity',
          active ? 'opacity-100' : 'opacity-0'
        )}
      />
    </motion.button>
  )
}

export function Dock() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const reduceMotion = useReducedMotion()
  const pointer = useMotionValue<DockPointer>({ x: Infinity, centers: [] })
  const containerRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const bar = barRef.current
    if (!container || !bar) return
    const buttons = Array.from(bar.querySelectorAll<HTMLButtonElement>('[data-dock-item]'))
    let baseline: { center: number; width: number }[] = []
    let latestX = Infinity

    const update = () => {
      if (baseline.length !== buttons.length || !Number.isFinite(latestX)) return
      // Inline styles contain the widths Motion actually rendered, rather than
      // the next spring values. Reading them does not force style/layout work.
      const widths = buttons.map(button => Number.parseFloat(button.style.width) || BASE)
      pointer.set({ x: latestX, centers: dockCenters(baseline, widths) })
    }
    const measure = () => {
      baseline = buttons.map(button => {
        const bounds = button.getBoundingClientRect()
        return { center: bounds.x + bounds.width / 2, width: bounds.width }
      })
      update()
    }
    const scheduleMeasure = () => { frame.read(measure) }
    const move = (event: MouseEvent) => {
      if (reduceMotion || event.clientX === latestX) return
      latestX = event.clientX
      // Motion deduplicates this callback: use only the newest position in a frame.
      frame.read(update)
    }
    const leave = () => {
      latestX = Infinity
      cancelFrame(update)
      pointer.set({ x: Infinity, centers: [] })
    }
    leave()
    scheduleMeasure()
    // Observe the fixed outer container, not the bar whose width animates.
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(container)
    window.addEventListener('resize', scheduleMeasure)
    bar.addEventListener('mousemove', move)
    bar.addEventListener('mouseleave', leave)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      bar.removeEventListener('mousemove', move)
      bar.removeEventListener('mouseleave', leave)
      cancelFrame(measure)
      cancelFrame(update)
    }
  }, [pointer, reduceMotion])

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  return (
    <div ref={containerRef} className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <motion.div
        ref={barRef}
        className="flex items-end gap-1.5 rounded-[1.4rem] border border-border/80 bg-background/72 px-2.5 pb-1.5 pt-1 shadow-[0_12px_40px_hsl(var(--foreground)/0.08)] backdrop-blur-2xl"
      >
        {NAV.map((n, index) => (
          <DockItem key={n.to} pointer={pointer} index={index} icon={n.icon} label={n.label} active={isActive(n.to)} onClick={() => navigate(n.to)} />
        ))}

        <span className="mx-1 mb-2 w-px self-stretch bg-border" />

        <DockItem
          pointer={pointer}
          index={NAV.length}
          icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? 'Light' : 'Dark'}
          onClick={toggle}
        />
      </motion.div>
    </div>
  )
}
