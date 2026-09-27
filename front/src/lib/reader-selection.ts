/** Reader-owned touch selection avoids the operating system's selection toolbar. */
export interface ReaderRange {
  range: Range
  custom: boolean
  adjust: (edge: 'start' | 'end', x: number, y: number) => void
}
export function clearReaderSelection() {
  const clear = (doc: Document) => {
    doc.dispatchEvent(new Event('reader-clear-selection'))
    doc.defaultView?.getSelection()?.removeAllRanges()
  }
  clear(document)
  document.querySelectorAll<HTMLIFrameElement>('.epub-viewport iframe').forEach(frame => {
    try { if (frame.contentDocument) clear(frame.contentDocument) } catch { /* Chapter unloaded. */ }
  })
}

let activeClear: (() => void) | null = null

export function bindReaderSelection(root: HTMLElement, onChange: (value: ReaderRange | null) => void, toLocal = (x: number, y: number) => ({ x, y })) {
  const doc = root.ownerDocument
  const view = doc.defaultView!
  let range: Range | null = null
  let custom = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let releaseTimer: ReturnType<typeof setTimeout> | undefined
  let start: { x: number; y: number; id: number } | null = null
  let held = false
  let pointing = false
  let dismissing = false
  let touch = view.matchMedia('(pointer: coarse)').matches
  const style = doc.createElement('style')
  // Only the reading surface is affected; note inputs keep normal editing menus.
  root.dataset.readerSelection = ''
  root.dataset.readerTouch = String(touch)
  style.textContent = '[data-reader-selection]{-webkit-touch-callout:none} [data-reader-touch="true"],[data-reader-touch="true"] *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}'
  doc.head.appendChild(style)
  const caret = (x: number, y: number) => {
    const api = doc as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null }
    const position = api.caretPositionFromPoint?.(x, y)
    const found = position ? doc.createRange() : api.caretRangeFromPoint?.(x, y)
    if (position && found) { found.setStart(position.offsetNode, position.offset); found.collapse(true) }
    return found && root.contains(found.startContainer) && found.startContainer.nodeType === 3 ? found : null
  }
  const clear = () => {
    clearTimeout(timer)
    range = null
    if (activeClear === clear) activeClear = null
    held = false
    view.getSelection()?.removeAllRanges()
    onChange(null)
  }
  const publish = () => {
    if (!range || !range.toString().trim()) return
    if (activeClear !== clear) activeClear?.()
    activeClear = clear
    onChange({ range: range.cloneRange(), custom, adjust })
  }
  const adjust = (edge: 'start' | 'end', x: number, y: number) => {
    if (!range) return
    const local = toLocal(x, y)
    const point = caret(local.x, local.y)
    if (!point) return
    const next = range.cloneRange()
    if (edge === 'start') next.setStart(point.startContainer, point.startOffset)
    else next.setEnd(point.startContainer, point.startOffset)
    if (!next.collapsed && next.toString().trim()) { range = next; publish() }
  }
  const nativeChange = () => {
    const selection = view.getSelection()
    if (!selection?.rangeCount || selection.isCollapsed) {
      if (!custom && range) clear()
      return
    }
    const next = selection.getRangeAt(0)
    if (!root.contains(next.commonAncestorContainer)) return
    range = next.cloneRange()
    custom = touch
    if (custom) selection.removeAllRanges()
    publish()
  }
  const down = (event: PointerEvent) => {
    pointing = true
    if (!root.contains(event.target as Node) || (event.target as Element).closest?.('a,button,input,textarea,select')) return
    touch = event.pointerType !== 'mouse'
    root.dataset.readerTouch = String(touch)
    if (!event.isPrimary) { clearTimeout(timer); start = null; held = false; return }
    dismissing = Boolean(activeClear || range)
    activeClear?.()
    if (event.pointerType === 'mouse') return
    start = { x: event.clientX, y: event.clientY, id: event.pointerId }
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (!start) return
      const point = caret(start.x, start.y)
      if (!point) return
      const text = point.startContainer.textContent ?? ''
      if (!text.trim()) return
      let a = Math.min(point.startOffset, text.length - 1)
      if (a > 0 && /[\uDC00-\uDFFF]/.test(text[a])) a--
      let b = a + ((text.codePointAt(a) ?? 0) > 0xffff ? 2 : 1)
      // A word for Latin text, a character for CJK; handles extend across paragraphs.
      const word = (char: string) => /[\p{L}\p{N}_]/u.test(char) && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char)
      if (word(text[a] ?? '')) {
        while (a > 0 && word(text[a - 1])) a--
        while (b < text.length && word(text[b])) b++
      }
      point.setStart(point.startContainer, a)
      point.setEnd(point.startContainer, b)
      range = point; custom = true; held = true
      view.getSelection()?.removeAllRanges()
      publish()
    }, 420)
  }
  const move = (event: PointerEvent) => {
    if (!start || start.id !== event.pointerId) return
    if (held) {
      const frame = view.frameElement?.getBoundingClientRect()
      adjust('end', event.clientX + (frame?.left ?? 0), event.clientY + (frame?.top ?? 0))
    }
    if (!held && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) { clearTimeout(timer); start = null }
  }
  const up = () => {
    clearTimeout(timer); start = null
    // Gesture listeners run later in the same event; a dismissal must not flip pages.
    clearTimeout(releaseTimer)
    releaseTimer = setTimeout(() => { held = false; dismissing = false; pointing = false }, 0)
  }
  const context = (event: Event) => { if (root.contains(event.target as Node)) event.preventDefault() }
  const touchMove = (event: TouchEvent) => { if (held && event.cancelable) event.preventDefault() }
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && range) { event.preventDefault(); clear() } }
  const externalClear = () => { dismissing = dismissing || (pointing && Boolean(range)); clear() }
  doc.addEventListener('selectionchange', nativeChange)
  doc.addEventListener('reader-clear-selection', externalClear)
  doc.addEventListener('pointerdown', down, true)
  doc.addEventListener('pointermove', move, true)
  doc.addEventListener('pointerup', up, true)
  doc.addEventListener('pointercancel', up, true)
  doc.addEventListener('contextmenu', context)
  doc.addEventListener('touchmove', touchMove, { passive: false })
  doc.addEventListener('keydown', key)
  return {
    text: () => dismissing || held ? 'selection' : range?.toString() ?? '',
    refresh: publish,
    dispose: () => {
      if (activeClear === clear) clear()
      clearTimeout(releaseTimer)
      clearTimeout(timer); style.remove(); delete root.dataset.readerSelection; delete root.dataset.readerTouch
      doc.removeEventListener('selectionchange', nativeChange)
      doc.removeEventListener('reader-clear-selection', externalClear)
      doc.removeEventListener('pointerdown', down, true)
      doc.removeEventListener('pointermove', move, true)
      doc.removeEventListener('pointerup', up, true)
      doc.removeEventListener('pointercancel', up, true)
      doc.removeEventListener('contextmenu', context)
      doc.removeEventListener('touchmove', touchMove)
      doc.removeEventListener('keydown', key)
    },
  }
}
