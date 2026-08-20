interface ReaderGestureOptions {
  pageNavigation?: boolean
  getSelection: () => string
  getWidth: () => number
  onNext: () => void
  onPrevious: () => void
  onToggleControls?: () => void
}

interface PointerStart {
  id: number
  time: number
  x: number
  y: number
}

const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [contenteditable="true"]'

function isInteractiveTarget(target: EventTarget | null): boolean {
  const element = target as { closest?: (selector: string) => Element | null } | null
  return typeof element?.closest === 'function' && Boolean(element.closest(INTERACTIVE_SELECTOR))
}

export function bindReaderGestures(target: EventTarget, options: ReaderGestureOptions): () => void {
  let start: PointerStart | null = null

  const onPointerDown = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent
    if (!event.isPrimary || isInteractiveTarget(event.target)) return
    start = { id: event.pointerId, time: performance.now(), x: event.clientX, y: event.clientY }
  }

  const onPointerCancel = () => {
    start = null
  }

  const onPointerUp = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent
    if (!start || event.pointerId !== start.id) return
    const gestureStart = start
    start = null
    if (options.getSelection().trim() || isInteractiveTarget(event.target)) return

    const deltaX = event.clientX - gestureStart.x
    const deltaY = event.clientY - gestureStart.y
    const distance = Math.hypot(deltaX, deltaY)
    const width = Math.max(1, options.getWidth())
    const swipeThreshold = Math.min(72, Math.max(44, width * 0.1))

    if (options.pageNavigation !== false && Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) options.onNext()
      else options.onPrevious()
      return
    }

    const isTap = distance < 12 && performance.now() - gestureStart.time < 420
    if (!isTap) return
    const relativeX = event.clientX / width
    if (options.pageNavigation !== false && relativeX <= 0.2) options.onPrevious()
    else if (options.pageNavigation !== false && relativeX >= 0.8) options.onNext()
    else options.onToggleControls?.()
  }

  target.addEventListener('pointerdown', onPointerDown)
  target.addEventListener('pointerup', onPointerUp)
  target.addEventListener('pointercancel', onPointerCancel)

  return () => {
    target.removeEventListener('pointerdown', onPointerDown)
    target.removeEventListener('pointerup', onPointerUp)
    target.removeEventListener('pointercancel', onPointerCancel)
  }
}
