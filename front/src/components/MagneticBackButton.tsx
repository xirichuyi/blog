import { useEffect, useRef, type PointerEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface MagneticBackButtonProps {
  to: string
}

const POINTER_FACTOR = 0.1

function supportsFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function MagneticBackButton({ to }: MagneticBackButtonProps) {
  const parallaxRef = useRef<HTMLSpanElement>(null)
  const frameRef = useRef(0)

  useEffect(
    () => () => {
      window.cancelAnimationFrame(frameRef.current)
    },
    [],
  )

  const setTransform = (transform: string) => {
    window.cancelAnimationFrame(frameRef.current)
    frameRef.current = window.requestAnimationFrame(() => {
      if (parallaxRef.current) parallaxRef.current.style.transform = transform
    })
  }

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === 'touch' || !supportsFinePointer()) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left - bounds.width / 2) * POINTER_FACTOR
    const y = (event.clientY - bounds.top - bounds.height / 2) * POINTER_FACTOR - 8
    setTransform(`translate3d(${x}px, ${y}px, 0) scale(1.1)`)
  }

  const enter = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== 'touch' && supportsFinePointer()) {
      setTransform('translate3d(0, -8px, 0) scale(1.1)')
    }
  }

  const leave = () => setTransform('translate3d(0, 0, 0)')

  return (
    <span className="article-back-slot">
      <span
        ref={parallaxRef}
        className="article-back-parallax"
        onPointerEnter={enter}
        onPointerMove={handlePointerMove}
        onPointerLeave={leave}
      >
        <Link to={to} className="article-magnetic-back" aria-label="返回文章列表">
          <span className="article-magnetic-back-content" aria-hidden="true">
            <ArrowLeft />
            <span>返回文章</span>
          </span>
        </Link>
      </span>
    </span>
  )
}
