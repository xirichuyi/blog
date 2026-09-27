interface ReaderGestureOptions {
  getWindow: () => Window
  pageNavigation?: boolean
  getHeight: () => number
  getSelection: () => string
  getWidth: () => number
  toLocalPoint?: (x: number, y: number) => { x: number; y: number }
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
const READER_HOVER_MEDIA = '(hover: hover) and (pointer: fine)'

export function isReaderHoverDevice(view: Window): boolean {
  return view.matchMedia(READER_HOVER_MEDIA).matches
}

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

export function bindReaderGestures(source: EventTarget, options: ReaderGestureOptions): () => void {
  let touchStart: GestureStart | null = null
  let lastTouchAt = Number.NEGATIVE_INFINITY
  let moved = false
  const pointers = new Set<number>()
  const local = options.toLocalPoint ?? ((x: number, y: number) => ({ x, y }))

  const handleTap = (clientX: number, clientY: number) => {
    const width = Math.max(1, options.getWidth())
    const height = Math.max(1, options.getHeight())
    const point = local(clientX, clientY)
    const relativeX = point.x / width
    const relativeY = point.y / height
    if (options.pageNavigation !== false && relativeX <= 0.2) options.onPrevious()
    else if (options.pageNavigation !== false && relativeX >= 0.8) options.onNext()
    else if (relativeX >= 0.22 && relativeX <= 0.78 && relativeY >= 0.12 && relativeY <= 0.88) options.onToggleControls?.()
  }

  const completeGesture = (gestureStart: GestureStart, clientX: number, clientY: number) => {
    const now = performance.now()
    const deltaX = clientX - gestureStart.x
    const deltaY = clientY - gestureStart.y
    const distance = Math.hypot(deltaX, deltaY)
    const width = Math.max(1, options.getWidth())
    const swipeThreshold = Math.min(72, Math.max(44, width * 0.1))

    if (options.pageNavigation !== false && Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) options.onNext()
      else options.onPrevious()
      return
    }
    if (!moved && distance < 24 && now - gestureStart.time < 650) {
      handleTap(clientX, clientY)
    }
  }

  const onMouseMove = (rawEvent: Event) => {
    const event = rawEvent as MouseEvent
    if (performance.now() - lastTouchAt > 1000 && isReaderHoverDevice(options.getWindow())) {
      options.onTopHoverChange?.(isReaderTopHover(local(event.clientX, event.clientY).y, options.getHeight()))
    }
  }

  const onTouchStart = (rawEvent: Event) => {
    const event = rawEvent as TouchEvent
    lastTouchAt = performance.now()
    if (event.touches.length !== 1 || isInteractiveTarget(event.target)) {
      touchStart = null
      return
    }
    moved = false
    const touch = event.touches[0]
    touchStart = { id: touch.identifier, time: performance.now(), x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (rawEvent: Event) => {
    const event = rawEvent as TouchEvent
    lastTouchAt = performance.now()
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

  const onTouchMove = (rawEvent: Event) => {
    const event = rawEvent as TouchEvent
    const touch = Array.from(event.touches).find(item => item.identifier === touchStart?.id)
    if (touch && touchStart && Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y) >= 24) moved = true
  }
  const onPointerDown = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent
    if (event.pointerType === 'mouse') return
    lastTouchAt = performance.now()
    pointers.add(event.pointerId)
    if (pointers.size !== 1 || !event.isPrimary || isInteractiveTarget(event.target)) { touchStart = null; return }
    moved = false
    touchStart = { id: event.pointerId, time: performance.now(), x: event.clientX, y: event.clientY }
  }
  const onPointerMove = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent
    if (touchStart?.id === event.pointerId && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) >= 24) moved = true
  }
  const onPointerEnd = (rawEvent: Event) => {
    const event = rawEvent as PointerEvent
    pointers.delete(event.pointerId)
    if (event.pointerType === 'mouse') return
    lastTouchAt = performance.now()
    const start = touchStart
    touchStart = null
    if (event.type === 'pointercancel' || !start || start.id !== event.pointerId || options.getSelection().trim() || isInteractiveTarget(event.target)) return
    completeGesture(start, event.clientX, event.clientY)
  }
  const onClick = (rawEvent: Event) => {
    const event = rawEvent as MouseEvent
    if (event.button !== 0 || performance.now() - lastTouchAt <= 1000 || options.getSelection().trim() || isInteractiveTarget(event.target)) return
    handleTap(event.clientX, event.clientY)
  }
  const bindings: [string, EventListener][] = 'PointerEvent' in options.getWindow()
    ? [['pointerdown', onPointerDown], ['pointermove', onPointerMove], ['pointerup', onPointerEnd], ['pointercancel', onPointerEnd]]
    : [['touchstart', onTouchStart], ['touchmove', onTouchMove], ['touchend', onTouchEnd], ['touchcancel', onTouchCancel]]
  bindings.push(['mousemove', onMouseMove], ['click', onClick])
  for (const [type, listener] of bindings) source.addEventListener(type, listener, { capture: true, passive: true })
  return () => { for (const [type, listener] of bindings) source.removeEventListener(type, listener, true) }
}

export function bindReaderKeyboard(source: EventTarget, options: ReaderKeyboardOptions): () => void {
  const onKeyDown = (rawEvent: Event) => {
    const event = rawEvent as KeyboardEvent
    if (
      document.querySelector('dialog[open]') !== null
      || event.defaultPrevented
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

  source.addEventListener('keydown', onKeyDown)
  return () => source.removeEventListener('keydown', onKeyDown)
}
