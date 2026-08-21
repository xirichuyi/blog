interface ReaderGestureOptions {
  getWindow: () => Window
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

interface ReaderEventEmitter {
  off: (type: string, listener: (event: Event) => void) => unknown
  on: (type: string, listener: (event: Event) => void) => unknown
}

type ReaderEventSource = EventTarget | ReaderEventEmitter

const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [contenteditable="true"]'
const TEXT_ENTRY_SELECTOR = 'input, select, textarea, [contenteditable="true"]'
const READER_HOVER_MEDIA = '(hover: hover) and (pointer: fine)'
const READER_TOUCH_MEDIA = '(hover: none), (pointer: coarse)'

export function isReaderHoverDevice(view: Window): boolean {
  return view.matchMedia(READER_HOVER_MEDIA).matches
}

export function isReaderTouchDevice(view: Window): boolean {
  return view.matchMedia(READER_TOUCH_MEDIA).matches
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

function isDomEventTarget(source: ReaderEventSource): source is EventTarget {
  return 'addEventListener' in source
}

function addReaderEvent(source: ReaderEventSource, type: string, listener: (event: Event) => void, passive = false): void {
  if (isDomEventTarget(source)) source.addEventListener(type, listener, passive ? { passive: true } : undefined)
  else source.on(type, listener)
}

function removeReaderEvent(source: ReaderEventSource, type: string, listener: (event: Event) => void): void {
  if (isDomEventTarget(source)) source.removeEventListener(type, listener)
  else source.off(type, listener)
}

export function bindReaderGestures(source: ReaderEventSource, options: ReaderGestureOptions): () => void {
  let touchStart: GestureStart | null = null

  const handleTap = (clientX: number, clientY: number) => {
    const width = Math.max(1, options.getWidth())
    const height = Math.max(1, options.getHeight())
    const relativeX = clientX / width
    const relativeY = clientY / height
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
    if (distance < 24 && now - gestureStart.time < 650) {
      handleTap(clientX, clientY)
    }
  }

  const onMouseMove = (rawEvent: Event) => {
    const event = rawEvent as MouseEvent
    if (isReaderHoverDevice(options.getWindow())) {
      options.onTopHoverChange?.(isReaderTopHover(event.clientY, options.getHeight()))
    }
  }

  const onTouchStart = (rawEvent: Event) => {
    const event = rawEvent as TouchEvent
    if (!isReaderTouchDevice(options.getWindow()) || event.touches.length !== 1 || isInteractiveTarget(event.target)) {
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

  addReaderEvent(source, 'mousemove', onMouseMove)
  addReaderEvent(source, 'touchstart', onTouchStart, true)
  addReaderEvent(source, 'touchend', onTouchEnd, true)

  return () => {
    removeReaderEvent(source, 'mousemove', onMouseMove)
    removeReaderEvent(source, 'touchstart', onTouchStart)
    removeReaderEvent(source, 'touchend', onTouchEnd)
  }
}

export function bindReaderKeyboard(source: ReaderEventSource, options: ReaderKeyboardOptions): () => void {
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

  addReaderEvent(source, 'keydown', onKeyDown)
  return () => removeReaderEvent(source, 'keydown', onKeyDown)
}
