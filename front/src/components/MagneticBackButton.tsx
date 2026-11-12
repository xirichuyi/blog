import { useEffect, useRef, type PointerEvent } from 'react'
import { ArrowLeft } from 'lucide-react'

interface MagneticBackButtonProps {
  onClick: () => void
}

const AVATAR_URL = 'https://avatars.githubusercontent.com/u/144898416'
const POINTER_FACTOR = 0.08
/** Past this scroll offset the avatar has turned into the back arrow. */
const SCROLL_REVEAL_AT = 160

function supportsFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

// The avatar morphs into a back arrow once the page is scrolled, or while the
// button is hovered or focused, and leans towards a nearby mouse. Script only
// flips an attribute and writes two CSS variables; every tween is a CSS
// transition on transform/opacity, so the compositor runs it at the display's
// refresh rate (see .article-magnetic-back in index.css).
export function MagneticBackButton({ onClick }: MagneticBackButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const parallaxRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return
    let scrolled: boolean | null = null
    const sync = () => {
      const next = window.scrollY > SCROLL_REVEAL_AT
      if (next === scrolled) return
      scrolled = next
      button.toggleAttribute('data-scrolled', next)
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [])

  const lean = (x: number, y: number) => {
    parallaxRef.current?.style.setProperty('--back-x', `${x}px`)
    parallaxRef.current?.style.setProperty('--back-y', `${y}px`)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch' || !supportsFinePointer()) return
    const bounds = event.currentTarget.getBoundingClientRect()
    lean(
      (event.clientX - bounds.left - bounds.width / 2) * POINTER_FACTOR,
      (event.clientY - bounds.top - bounds.height / 2) * POINTER_FACTOR,
    )
  }

  return (
    <span className="article-back-slot">
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => lean(0, 0)}
        className="article-magnetic-back"
        aria-label="Go back"
      >
        <span ref={parallaxRef} className="article-back-parallax" aria-hidden="true">
          <span className="article-magnetic-back-surface">
            <span className="article-magnetic-back-feedback">
              <img src={AVATAR_URL} alt="" className="article-magnetic-back-avatar" width="44" height="44" />
              <span className="article-magnetic-back-arrow">
                <ArrowLeft />
              </span>
            </span>
          </span>
        </span>
      </button>
    </span>
  )
}
