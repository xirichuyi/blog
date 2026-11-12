import { type PointerEvent } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

interface MagneticBackButtonProps {
  onClick: () => void
}

const AVATAR_URL = 'https://avatars.githubusercontent.com/u/144898416'
const POINTER_FACTOR = 0.08
const SCROLL_TRANSITION_DISTANCE = 420

function supportsFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function MagneticBackButton({ onClick }: MagneticBackButtonProps) {
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const hoverTarget = useMotionValue(0)
  const xTarget = useMotionValue(0)
  const yTarget = useMotionValue(0)

  const rawScrollProgress = useTransform(scrollY, (value) =>
    Math.min(1, Math.max(0, value / SCROLL_TRANSITION_DISTANCE)),
  )
  const scrollProgress = useSpring(rawScrollProgress, {
    stiffness: 150,
    damping: 28,
    mass: 0.45,
  })
  const hoverProgress = useSpring(hoverTarget, {
    stiffness: 260,
    damping: 24,
    mass: 0.35,
  })
  const magneticX = useSpring(xTarget, { stiffness: 300, damping: 25, mass: 0.3 })
  const magneticY = useSpring(yTarget, { stiffness: 300, damping: 25, mass: 0.3 })

  const activeScrollProgress = reduceMotion ? rawScrollProgress : scrollProgress
  const activeHoverProgress = reduceMotion ? hoverTarget : hoverProgress
  const revealProgress = useTransform(
    [activeScrollProgress, activeHoverProgress],
    ([scroll, hover]) => Math.max(Number(scroll), Number(hover)),
  )
  const surfaceScale = useTransform(revealProgress, [0, 1], [0.78, 1])
  const avatarOpacity = useTransform(revealProgress, [0, 0.55, 1], [1, 0.18, 0])
  const arrowOpacity = useTransform(revealProgress, [0, 0.45, 1], [0, 0.2, 1])
  const arrowScale = useTransform(revealProgress, [0, 1], [0.82, 1])

  const setHovered = (hovered: boolean) => hoverTarget.set(hovered ? 1 : 0)

  const resetMagnetism = () => {
    xTarget.set(0)
    yTarget.set(0)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (reduceMotion || event.pointerType === 'touch' || !supportsFinePointer()) return
    const bounds = event.currentTarget.getBoundingClientRect()
    xTarget.set((event.clientX - bounds.left - bounds.width / 2) * POINTER_FACTOR)
    yTarget.set((event.clientY - bounds.top - bounds.height / 2) * POINTER_FACTOR)
  }

  const handlePointerLeave = () => {
    setHovered(false)
    resetMagnetism()
  }

  return (
    <span className="article-back-slot">
      <button
        type="button"
        onClick={onClick}
        onPointerEnter={(event) => event.pointerType !== 'touch' && setHovered(true)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="article-magnetic-back"
        aria-label="Go back"
      >
        <motion.span
          className="article-back-parallax"
          style={{ x: reduceMotion ? 0 : magneticX, y: reduceMotion ? 0 : magneticY }}
          aria-hidden="true"
        >
          <motion.span className="article-magnetic-back-surface" style={{ scale: surfaceScale }}>
            <span className="article-magnetic-back-feedback">
              <motion.img
                src={AVATAR_URL}
                alt=""
                className="article-magnetic-back-avatar"
                width="44"
                height="44"
                style={{ opacity: avatarOpacity }}
              />
              <motion.span
                className="article-magnetic-back-arrow"
                style={{ opacity: arrowOpacity, scale: arrowScale }}
              >
                <ArrowLeft />
              </motion.span>
            </span>
          </motion.span>
        </motion.span>
      </button>
    </span>
  )
}
