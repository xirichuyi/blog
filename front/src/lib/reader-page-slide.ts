// Page-turn motion for the paginated EPUB layout.
//
// EPUB.js lays a chapter out as one wide strip of columns and shows a page by
// setting the scroll offset of its container, with no motion. Here the strip
// follows the finger while it drags and glides to the neighbouring page on
// release. A chapter is a separate document, so at a chapter edge there is no
// neighbouring page to reveal: the page slides out, the next chapter loads,
// and its first page slides in.

export interface PageSliderOptions {
  /** The element EPUB.js scrolls horizontally (its stage container). */
  getContainer: () => HTMLElement | null
  /** Scroll distance of one page turn (two columns on a wide spread). */
  getPageDelta: () => number
  /** Move to the next / previous page the slow way, crossing chapters when needed. */
  next: () => Promise<unknown>
  previous: () => Promise<unknown>
  reducedMotion: () => boolean
}

export interface PageSlider {
  /** Returns false when a drag cannot start right now. */
  dragStart: () => boolean
  /** `dx` is the finger's horizontal travel since the drag began (negative = towards the next page). */
  dragMove: (dx: number) => void
  /** `velocity` is in px/ms, signed like `dx`. */
  dragEnd: (dx: number, velocity: number) => void
  /** Animated page turn for taps, keys, the wheel and toolbar buttons. */
  turn: (direction: 1 | -1) => void
  dispose: () => void
}

const GLIDE_MS = 260
const LEAVE_MS = 150
const ENTER_MS = 220
const easeOut = (t: number) => 1 - (1 - t) ** 3

export function createPageSlider(options: PageSliderOptions): PageSlider {
  let frame = 0
  let glideTarget: { container: HTMLElement; left: number } | null = null
  let dragBase: number | null = null
  let crossing = false
  let disposed = false
  const timers = new Set<ReturnType<typeof setTimeout>>()

  const wait = (ms: number) => new Promise<void>((resolve) => {
    const timer = setTimeout(() => { timers.delete(timer); resolve() }, ms)
    timers.add(timer)
  })

  const finishGlide = () => {
    if (!glideTarget) return
    cancelAnimationFrame(frame)
    glideTarget.container.scrollLeft = glideTarget.left
    glideTarget = null
  }

  const glideTo = (container: HTMLElement, left: number, duration = GLIDE_MS) => {
    finishGlide()
    const from = container.scrollLeft
    if (Math.abs(left - from) < 1) { container.scrollLeft = left; return }
    glideTarget = { container, left }
    const started = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      container.scrollLeft = from + (left - from) * easeOut(progress)
      if (progress < 1) frame = requestAnimationFrame(step)
      else { container.scrollLeft = left; glideTarget = null }
    }
    frame = requestAnimationFrame(step)
  }

  const resetStyle = (container: HTMLElement) => {
    container.style.transition = ''
    container.style.transform = ''
    container.style.opacity = ''
  }

  /** Whether the neighbouring page is part of the chapter that is already laid out. */
  const pageWithinChapter = (container: HTMLElement, from: number, direction: 1 | -1, delta: number) => (
    direction > 0 ? from + container.offsetWidth + delta <= container.scrollWidth : from > 0
  )

  const crossChapter = async (container: HTMLElement, direction: 1 | -1) => {
    crossing = true
    try {
      container.style.transition = `transform ${LEAVE_MS}ms ease-in, opacity ${LEAVE_MS}ms ease-in`
      container.style.transform = `translateX(${-direction * 18}%)`
      container.style.opacity = '0'
      await wait(LEAVE_MS)
      await (direction > 0 ? options.next() : options.previous()).catch(() => undefined)
      if (disposed) return
      container.style.transition = 'none'
      container.style.transform = `translateX(${direction * 10}%)`
      void container.offsetWidth
      container.style.transition = `transform ${ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${ENTER_MS}ms ease-out`
      container.style.transform = 'translateX(0)'
      container.style.opacity = '1'
      await wait(ENTER_MS)
    } finally {
      if (!disposed) resetStyle(container)
      crossing = false
    }
  }

  const go = (container: HTMLElement, from: number, direction: 1 | -1) => {
    const delta = options.getPageDelta()
    if (delta > 0 && pageWithinChapter(container, from, direction, delta)) {
      resetStyleSmoothly(container)
      const max = container.scrollWidth - container.clientWidth
      glideTo(container, Math.min(max, Math.max(0, from + direction * delta)))
    } else {
      void crossChapter(container, direction)
    }
  }

  /** Let a rubber-band offset settle back instead of snapping. */
  const resetStyleSmoothly = (container: HTMLElement) => {
    if (!container.style.transform) return
    container.style.transition = 'transform 200ms ease-out'
    container.style.transform = 'translateX(0)'
    const timer = setTimeout(() => { timers.delete(timer); if (!crossing && dragBase === null) resetStyle(container) }, 210)
    timers.add(timer)
  }

  return {
    dragStart() {
      const container = options.getContainer()
      if (!container || crossing || options.reducedMotion()) return false
      finishGlide()
      resetStyle(container)
      dragBase = container.scrollLeft
      return true
    },
    dragMove(dx) {
      const container = options.getContainer()
      if (!container || dragBase === null) return
      const max = container.scrollWidth - container.clientWidth
      const wanted = dragBase - dx
      const left = Math.min(max, Math.max(0, wanted))
      container.scrollLeft = left
      // Past the first or last page of the chapter the strip cannot scroll;
      // let it give a little so the drag still feels attached.
      const beyond = wanted - left
      container.style.transition = 'none'
      container.style.transform = beyond ? `translateX(${-beyond * 0.35}px)` : ''
    },
    dragEnd(dx, velocity) {
      const container = options.getContainer()
      const base = dragBase
      dragBase = null
      if (!container || base === null) return
      const far = Math.abs(dx) > Math.min(90, container.clientWidth * 0.18)
      const flick = Math.abs(velocity) > 0.35 && Math.abs(dx) > 12 && Math.sign(velocity) === Math.sign(dx)
      if (far || flick) {
        go(container, base, dx < 0 ? 1 : -1)
      } else {
        resetStyleSmoothly(container)
        glideTo(container, base, 200)
      }
    },
    turn(direction) {
      const container = options.getContainer()
      if (crossing || dragBase !== null) return
      if (!container || options.reducedMotion()) {
        void (direction > 0 ? options.next() : options.previous()).catch(() => undefined)
        return
      }
      // A turn requested mid-glide starts from where that glide was heading.
      finishGlide()
      go(container, container.scrollLeft, direction)
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      glideTarget = null
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      const container = options.getContainer()
      if (container) resetStyle(container)
    },
  }
}
