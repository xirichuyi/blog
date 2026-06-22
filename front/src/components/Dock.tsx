import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Home, FileText, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/articles', label: 'Articles', icon: FileText },
]

const BASE = 38
const MAX = 58
const RANGE = 140 // px proximity falloff

function DockItem({
  mouseX,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  mouseX: MotionValue<number>
  icon: LucideIcon
  label: string
  active?: boolean
  onClick: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)

  const distance = useTransform(mouseX, (val) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: BASE }
    return val - b.x - b.width / 2
  })
  const widthTarget = useTransform(distance, [-RANGE, 0, RANGE], [BASE, MAX, BASE])
  const width = useSpring(widthTarget, { mass: 0.1, stiffness: 170, damping: 14 })
  // Icon scales from the bottom — the bar's height stays fixed; magnified
  // icons rise above the bar and push neighbours apart horizontally.
  const scale = useTransform(width, [BASE, MAX], [1, MAX / BASE])

  return (
    <motion.button
      ref={ref}
      style={{ width, height: BASE }}
      onClick={onClick}
      aria-label={label}
      className="group/item relative flex shrink-0 items-end justify-center"
    >
      {/* tooltip */}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover/item:opacity-100">
        {label}
      </span>
      {/* icon tile — fixed box, scaled via transform from the bottom */}
      <motion.span
        style={{ width: BASE, height: BASE, scale, transformOrigin: 'bottom center' }}
        className={cn(
          'grid place-items-center rounded-full transition-colors [&>svg]:size-[42%]',
          active
            ? 'bg-foreground/10 text-foreground'
            : 'bg-secondary text-muted-foreground group-hover/item:bg-foreground/10 group-hover/item:text-foreground'
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
  const mouseX = useMotionValue(Infinity)

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end gap-1.5 rounded-[1.5rem] border border-border bg-background/60 px-2.5 pb-1.5 pt-1 shadow-xl backdrop-blur-2xl"
      >
        {NAV.map((n) => (
          <DockItem key={n.to} mouseX={mouseX} icon={n.icon} label={n.label} active={isActive(n.to)} onClick={() => navigate(n.to)} />
        ))}

        <span className="mx-1 mb-2 w-px self-stretch bg-border" />

        <DockItem
          mouseX={mouseX}
          icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? 'Light' : 'Dark'}
          onClick={toggle}
        />
      </motion.div>
    </div>
  )
}
