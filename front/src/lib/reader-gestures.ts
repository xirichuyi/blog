interface ReaderGestureOptions {
  pageNavigation?: boolean
  getHeight: () => number
  getSelection: () => string
  getWidth: () => number
  onNext: () => void
  onPrevious: () => void
  onTopHoverChange?: (hovered: boolean) => void
  onToggleControls?: () => void
}

interface ReaderKeyboardOptions {
  pageNavigation?: boolean
  getSelection: () => string
  onNext: () => void
  onPrevious: () => void
}

interface GestureStart {
  id: number
  time: number
  x: number
  y: number
}

const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [contenteditable="true"]'
const TEXT_ENTRY_SELECTOR = 'input, select, textarea, [contenteditable="true"]'

export function isReaderTopHover(clientY: number, height: number): boolean {
  const hoverHeight = Math.min(96, Math.max(64, height * 0.12))
  return clientY >= 0 && clientY <= hoverHeight
}

function targetMatches(target: EventTarget | null, selector: string): boolean {
  const element = target as { closest?: (selector: string) => Element | null } | null
  return typeof element?.closest === 'function' && Boolean(element.closest(selector))
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return targetMatches(target, INTERACTIVE_SELECTOR)
}

export function bindReaderGestures(target: EventTarget, options: ReaderGestureOptions): () => void {
  let pointerStart: GestureStart | null = null
  let touchStart: GestureStart | null = null
  let lastDirectHandledAt: number | null = null
  let lastHandledAt: number | null = null

  const handleTap = (clientX: number, clientY: number): boolean => {
    const width = Math.max(1, options.getWidth())
    const height = Math.max(1, options.getHeight())
    const relativeX = clientX / width
    const relativeY = clientY / height
    if (options.pageNavigation !== false && relativeX <= 0.2) options.onPrevious()
    else if (options.pageNavigation !== false && relativeX >= 0.8) options.onNext()
    else if (relativeX >= 0.22 && relativeX <= 0.78 && relativeY >= 0.12 && relativeY <= 0.88) options.onToggleControls?.()
    else return false
    return true
  }

  const completeGesture = (gestureStart: GestureStart, clientX: number, clientY: number): boolean => {
    const now = performance.now()
    if (lastDirectHandledAt !== null && now - lastDirectHandledAt < 120) return false

    const deltaX = clientX - gestureStart.x
    const deltaY = clientY - gestureStart.y
    const distance = Math.hypot(deltaX, deltaY)
    const width = Math.max(1, options.getWidth())
    const swipeThreshold = Math.min(72, Math.max(44, width * 0.1))
    let handled = false

    if (options.pageNavigation !== false && Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) options.onNext()
      else options.onPrevious()
      handled = true
    } else if (distance < 24 && now - gestureStart.time < 650) {
      handled = handleTap(clientX, clientY)
    }

    if (handled) {
      lastDirectHandledAt = now
      lastHandledAt = now
    }
    return handled
  }

  const onPointerDown = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent
    if (!event.isPrimary || isInteractiveTarget(event.target)) return
    pointerStart = { id: event.pointerId, time: performance.now(), x: event.clientX, y: event.clientY }
  }

  const onPointerCancel = () => {
    pointerStart = null
  }

  const onPointerMove = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent
    if (event.pointerType === 'mouse') {
      options.onTopHoverChange?.(isReaderTopHover(event.clientY, options.getHeight()))
    }
  }

  const onPointerUp = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent
    if (!pointerStart || event.pointerId !== pointerStart.id) return
    const gestureStart = pointerStart
    pointerStart = null
    if (options.getSelection().trim() || isInteractiveTarget(event.target)) return
    completeGesture(gestureStart, event.clientX, event.clientY)
  }

  const onTouchStart = (rawEvent: Event) => {
    const event = rawEvent as TouchEvent
    if (event.touches.length !== 1 || isInteractiveTarget(event.target)) {
      touchStart = null
      return
    }
    const touch = event.touches[0]
    touchStart = { id: touch.identifier, time: performance.now(), x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (rawEvent: Event) => {
    const event = rawEvent as TouchEvent
    if (!touchStart) return
    const gestureStart = touchStart
    touchStart = null
    if (options.getSelection().trim() || isInteractiveTarget(event.target)) return
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === gestureStart.id)
    if (touch) completeGesture(gestureStart, touch.clientX, touch.clientY)
  }

  const onTouchCancel = () => {
    touchStart = null
  }

  const onClick = (rawEvent: Event) => {
    const event = rawEvent as MouseEvent
    // Ignore the synthesized click when Pointer or Touch handling already completed.
    if (
      (lastHandledAt !== null && performance.now() - lastHandledAt < 700)
      || options.getSelection().trim()
      || isInteractiveTarget(event.target)
    ) return
    if (handleTap(event.clientX, event.clientY)) lastHandledAt = performance.now()
  }

  target.addEventListener('pointerdown', onPointerDown)
  target.addEventListener('pointermove', onPointerMove)
  target.addEventListener('pointerup', onPointerUp)
  target.addEventListener('pointercancel', onPointerCancel)
  target.addEventListener('touchstart', onTouchStart, { passive: true })
  target.addEventListener('touchend', onTouchEnd, { passive: true })
  target.addEventListener('touchcancel', onTouchCancel, { passive: true })
  target.addEventListener('click', onClick)

  return () => {
    target.removeEventListener('pointerdown', onPointerDown)
    target.removeEventListener('pointermove', onPointerMove)
    target.removeEventListener('pointerup', onPointerUp)
    target.removeEventListener('pointercancel', onPointerCancel)
    target.removeEventListener('touchstart', onTouchStart)
    target.removeEventListener('touchend', onTouchEnd)
    target.removeEventListener('touchcancel', onTouchCancel)
    target.removeEventListener('click', onClick)
  }
}

export function bindReaderKeyboard(target: EventTarget, options: ReaderKeyboardOptions): () => void {
  const onKeyDown = (rawEvent: Event) => {
    const event = rawEvent as KeyboardEvent
    if (
      event.defaultPrevented
      || event.isComposing
      || event.metaKey
      || event.ctrlKey
      || event.altKey
      || targetMatches(event.target, TEXT_ENTRY_SELECTOR)
      || options.getSelection().trim()
    ) return

    const paginated = options.pageNavigation !== false
    const previous = event.key === 'ArrowLeft'
      || (paginated && (event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)))
    const next = event.key === 'ArrowRight'
      || (paginated && (event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)))

    if (!previous && !next) return
    // Keep Space available for activating focused reader controls.
    if (event.key === ' ' && isInteractiveTarget(event.target)) return
    event.preventDefault()
    if (previous) options.onPrevious()
    else options.onNext()
  }

  target.addEventListener('keydown', onKeyDown)
  return () => target.removeEventListener('keydown', onKeyDown)
}
