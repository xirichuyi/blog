import { useEffect, useRef, type PointerEvent } from 'react'
import { ArrowLeft } from 'lucide-react'

interface MagneticBackButtonProps {
  onClick: () => void
}

const AVATAR_URL = 'https://avatars.githubusercontent.com/u/144898416'
const POINTER_FACTOR = 0.08
/** Scroll distance over which the avatar turns into the back arrow. */
const SCROLL_TRANSITION_DISTANCE = 420
const RESTING_SCALE = 0.78
/** Browsers with scroll-driven animations run the scroll morph themselves (index.css). */
const SCROLL_MORPH_IS_CSS_DRIVEN = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')

function supportsFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

// The avatar turns into a back arrow in step with the first 420px of scroll,
// and fully while the button is hovered or focused, whichever is further
// along. It also leans towards a nearby mouse.
//
// The scroll part and the hover part live on separate layers so each can be
// run by the compositor: the scroll layers follow a CSS scroll timeline, the
// hover layers are CSS transitions. Stacking them gives the "whichever is
// further" result without script computing a frame (see index.css).
export function MagneticBackButton({ onClick }: MagneticBackButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const parallaxRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return
    let frame = 0
    const sync = () => {
      frame = 0
      const progress = Math.min(1, Math.max(0, window.scrollY / SCROLL_TRANSITION_DISTANCE))
      // How much hovering still has to enlarge the surface to reach full size.
      button.style.setProperty('--back-hover-scale', String(1 / (RESTING_SCALE + (1 - RESTING_SCALE) * progress)))
      // Fallback for browsers without scroll timelines: drive the scroll layers from here.
      if (!SCROLL_MORPH_IS_CSS_DRIVEN) button.style.setProperty('--back-scroll', String(progress))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync) }
    sync()
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      window.removeEventListener('scroll', schedule)
      cancelAnimationFrame(frame)
    }
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
          <span className="article-magnetic-back-hover">
            <span className="article-magnetic-back-surface">
              <span className="article-magnetic-back-feedback">
                <span className="article-magnetic-back-avatar">
                  <img src={AVATAR_URL} alt="" width="44" height="44" />
                </span>
                {/* Two identical arrows: one follows the scroll, one answers hover. */}
                <span className="article-magnetic-back-arrow is-scroll"><ArrowLeft /></span>
                <span className="article-magnetic-back-arrow is-hover"><ArrowLeft /></span>
              </span>
            </span>
          </span>
        </span>
      </button>
    </span>
  )
}
