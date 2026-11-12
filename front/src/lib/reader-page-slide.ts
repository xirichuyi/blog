// Page-turn motion for the paginated EPUB layout.
//
// EPUB.js lays a chapter out as one wide strip of columns and shows a page by
// setting the scroll offset of its container, with no motion. Here the strip
// follows the finger while it drags and glides to the neighbouring page on
// release. A chapter is a separate document, so at a chapter edge there is no
// neighbouring page to reveal: the page slides out, the next chapter loads,
// and its first page slides in.
//
// All motion is a CSS transform (and opacity) on already-painted layers. The
// glide is a CSS transition, so the browser's compositor runs it at the
// display's native refresh rate without any per-frame script, layout or paint.
// The scroll offset EPUB.js relies on is only written once, when a glide ends.

export interface PageSliderOptions {
  /** The element EPUB.js scrolls horizontally (its stage container). */
  getContainer: () => HTMLElement | null
  /** Scroll distance of one page turn (two columns on a wide spread). */
  getPageDelta: () => number
  /** Move to the next / previous page the slow way, crossing chapters when needed. */
  next: () => Promise<unknown>
  previous: () => Promise<unknown>
  /** False at the very first / last page of the book, where there is nothing to turn to. */
  hasChapterBeyond: (direction: 1 | -1) => boolean
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

const GLIDE_MS = 280
const SETTLE_MS = 220
const LEAVE_MS = 150
const ENTER_MS = 220
const GLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

export function createPageSlider(options: PageSliderOptions): PageSlider {
  // A glide in flight: the strip is transitioning towards `shift`, and
  // `left` is the scroll offset to commit when it arrives.
  let glide: { container: HTMLElement; left: number; timer: ReturnType<typeof setTimeout> } | null = null
  let dragBase: number | null = null
  let crossing = false
  let disposed = false
  const timers = new Set<ReturnType<typeof setTimeout>>()

  const wait = (ms: number) => new Promise<void>((resolve) => {
    const timer = setTimeout(() => { timers.delete(timer); resolve() }, ms)
    timers.add(timer)
  })

  /** The page strip: EPUB.js view elements inside the clipping container. */
  const strip = (container: HTMLElement) => Array.from(container.children) as HTMLElement[]

  const setShift = (container: HTMLElement, px: number, transition = 'none') => {
    for (const view of strip(container)) {
      view.style.transition = transition
      view.style.transform = px ? `translate3d(${px}px, 0, 0)` : ''
    }
  }

  const setSliding = (container: HTMLElement, sliding: boolean) => {
    // Overlays positioned from the page layout (note markers) sit out the motion.
    container.closest('.epub-reader')?.classList.toggle('is-page-sliding', sliding)
  }

  /** Swap the visual shift for the real scroll offset in one frame. */
  const commit = (container: HTMLElement, left: number) => {
    setShift(container, 0)
    container.scrollLeft = left
    setSliding(container, false)
  }

  const finishGlide = () => {
    if (!glide) return
    clearTimeout(glide.timer)
    timers.delete(glide.timer)
    const { container, left } = glide
    glide = null
    commit(container, left)
  }

  /** Transition the strip from its current shift to the page at scroll offset `left`. */
  const glideTo = (container: HTMLElement, left: number, duration: number) => {
    finishGlide()
    const shift = container.scrollLeft - left
    setSliding(container, true)
    // Flush the starting position so the transition has something to run from.
    void container.offsetWidth
    setShift(container, shift, `transform ${duration}ms ${GLIDE_EASING}`)
    const timer = setTimeout(() => { timers.delete(timer); finishGlide() }, duration + 20)
    timers.add(timer)
    glide = { container, left, timer }
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
    setSliding(container, true)
    try {
      container.style.transition = `transform ${LEAVE_MS}ms ease-in, opacity ${LEAVE_MS}ms ease-in`
      container.style.transform = `translate3d(${-direction * 18}%, 0, 0)`
      container.style.opacity = '0'
      await wait(LEAVE_MS)
      setShift(container, 0)
      await (direction > 0 ? options.next() : options.previous()).catch(() => undefined)
      if (disposed) return
      container.style.transition = 'none'
      container.style.transform = `translate3d(${direction * 10}%, 0, 0)`
      void container.offsetWidth
      container.style.transition = `transform ${ENTER_MS}ms ${GLIDE_EASING}, opacity ${ENTER_MS}ms ease-out`
      container.style.transform = 'translate3d(0, 0, 0)'
      container.style.opacity = '1'
      await wait(ENTER_MS)
    } finally {
      if (!disposed) { resetStyle(container); setSliding(container, false) }
      crossing = false
    }
  }

  const go = (container: HTMLElement, from: number, direction: 1 | -1) => {
    const delta = options.getPageDelta()
    if (delta > 0 && pageWithinChapter(container, from, direction, delta)) {
      const max = container.scrollWidth - container.clientWidth
      glideTo(container, Math.min(max, Math.max(0, from + direction * delta)), GLIDE_MS)
    } else if (options.hasChapterBeyond(direction)) {
      void crossChapter(container, direction)
    } else {
      // First or last page of the book: settle back rather than play a turn.
      glideTo(container, from, SETTLE_MS)
    }
  }

  return {
    dragStart() {
      const container = options.getContainer()
      if (!container || crossing || options.reducedMotion()) return false
      finishGlide()
      dragBase = container.scrollLeft
      setSliding(container, true)
      return true
    },
    dragMove(dx) {
      const container = options.getContainer()
      if (!container || dragBase === null) return
      const max = container.scrollWidth - container.clientWidth
      const wanted = dragBase - dx
      const reachable = Math.min(max, Math.max(0, wanted))
      // Past the first or last page of the chapter there is nothing to show;
      // let the strip give a little so the drag still feels attached.
      const beyond = wanted - reachable
      setShift(container, dragBase - reachable - beyond * 0.35)
    },
    dragEnd(dx, velocity) {
      const container = options.getContainer()
      const base = dragBase
      dragBase = null
      if (!container || base === null) return
      const far = Math.abs(dx) >= Math.min(64, Math.max(36, container.clientWidth * 0.1))
      const flick = Math.abs(velocity) > 0.35 && Math.abs(dx) > 12 && Math.sign(velocity) === Math.sign(dx)
      if (far || flick) go(container, base, dx < 0 ? 1 : -1)
      else glideTo(container, base, SETTLE_MS)
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
      const container = glide?.container ?? options.getContainer()
      if (glide) clearTimeout(glide.timer)
      glide = null
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      if (container) { setShift(container, 0); resetStyle(container); setSliding(container, false) }
    },
  }
}
