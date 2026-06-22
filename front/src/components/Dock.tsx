import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Home, FileText, User, Mail, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/articles', label: 'Articles', icon: FileText },
  { to: '/about', label: 'About', icon: User },
  { to: '/contact', label: 'Contact', icon: Mail },
]

const BASE = 44
const MAX = 76
const RANGE = 150 // px proximity falloff

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
  const sizeTarget = useTransform(distance, [-RANGE, 0, RANGE], [BASE, MAX, BASE])
  const size = useSpring(sizeTarget, { mass: 0.1, stiffness: 170, damping: 14 })

  return (
    <motion.button
      ref={ref}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={label}
      className="group/item relative grid aspect-square shrink-0 place-items-center"
    >
      {/* tooltip */}
      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover/item:opacity-100">
        {label}
      </span>
      {/* icon tile — cdk-style circular grey tile */}
      <span
        className={cn(
          'grid h-full w-full place-items-center rounded-full transition-colors [&>svg]:h-[42%] [&>svg]:w-[42%]',
          active
            ? 'bg-foreground/10 text-foreground'
            : 'bg-secondary text-muted-foreground group-hover/item:bg-foreground/10 group-hover/item:text-foreground'
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
        className="flex items-end gap-2 rounded-[1.75rem] border border-border bg-background/60 px-3 pb-2 pt-1 shadow-xl backdrop-blur-2xl"
      >
        {NAV.map((n) => (
          <DockItem key={n.to} mouseX={mouseX} icon={n.icon} label={n.label} active={isActive(n.to)} onClick={() => navigate(n.to)} />
        ))}

        <span className="mx-1 mb-2 w-px self-stretch bg-border" />

        <DockItem
          mouseX={mouseX}
          icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? '浅色' : '深色'}
          onClick={toggle}
        />
      </motion.div>
    </div>
  )
}
