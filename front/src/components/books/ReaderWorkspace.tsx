import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Check, CloudOff, Copy, Highlighter, MessageCircle, PenLine, Trash2, UserRound, X } from 'lucide-react'
import { ReaderSession, type ReaderEntry, type ReaderSnapshot, type NoteRect } from '@/lib/reader-state'
import type { ReaderProgress } from '@/lib/book-progress'
import type { NoteAnchor, NoteMarker } from '@/lib/reader-annotations'
import { clearReaderSelection, type ReaderRange } from '@/lib/reader-selection'
import { googleLoginUrl } from '@/services/admin'
import type { BookFile } from '@/services/api'

export interface ReaderSelection { position: ReaderProgress; quote: string; anchor: NoteAnchor; rects?: NoteRect[]; touch?: { rects: NoteAnchor[]; adjust: ReaderRange['adjust'] } }
interface NotePanel { serial: number; ids: string[]; anchor: NoteAnchor; selection?: ReaderSelection }
interface ReaderContextValue {
  session: ReaderSession
  snapshot: ReaderSnapshot
  selection: ReaderSelection | null
  setSelection: (selection: ReaderSelection | null) => void
  openNotes: (ids: string[], anchor: NoteAnchor) => void
  loginHref: string
}
const ReaderContext = createContext<ReaderContextValue | null>(null)
export function useReaderWorkspace() {
  const value = useContext(ReaderContext)
  if (!value) throw new Error('ReaderWorkspace is required')
  return value
}
export function positionLabel(position: ReaderProgress | null) {
  return !position ? '—' : position.kind === 'pdf' ? `${position.page} / ${position.pages}` : `${Math.round(position.percent)}%`
}

export function ReaderWorkspace({ bookId, file, children }: { bookId: number; file: BookFile; children: ReactNode }) {
  const [session, setSession] = useState<ReaderSession | null>(null)
  useEffect(() => {
    const next = new ReaderSession(bookId, file.id, file.format.toLowerCase())
    setSession(next)
    void next.start()
    return () => next.dispose()
  }, [bookId, file.id, file.format])
  return session ? <WorkspaceSession session={session} loginHref={googleLoginUrl(`/books/${bookId}/read?file=${file.id}`)}>{children}</WorkspaceSession> : <div className="reader-route-state">正在打开…</div>
}

function WorkspaceSession({ session, loginHref, children }: { session: ReaderSession; loginHref: string; children: ReactNode }) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const [selection, setSelection] = useState<ReaderSelection | null>(null)
  const [panel, setPanel] = useState<NotePanel | null>(null)
  const serial = useRef(0)
  const pressedAt = useRef(Number.NEGATIVE_INFINITY)
  const openNotes = useCallback((ids: string[], anchor: NoteAnchor) => {
    setSelection(null)
    setPanel({ ids, anchor, serial: ++serial.current })
  }, [])
  useEffect(() => {
    if (!panel) return
    clearReaderSelection()
  }, [panel])
  useEffect(() => {
    if (!selection) return
    const dismiss = (event: PointerEvent) => {
      if ((event.target as Element).closest?.('.reader-selection-action,.reader-selection-handle,dialog')) return
      clearReaderSelection()
      setSelection(null)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { clearReaderSelection(); setSelection(null) } }
    document.addEventListener('pointerdown', dismiss, true)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss, true); document.removeEventListener('keydown', escape) }
  }, [selection])
  if (!snapshot.ready) return <div className="reader-route-state" role="status">
    <span>{snapshot.message || '正在打开…'}</span>
    {snapshot.status === 'error' && <button type="button" onClick={() => void session.start()}>重试</button>}
  </div>
  const percent = snapshot.data.progress?.kind === 'epub' ? snapshot.data.progress.percent : snapshot.data.progress ? snapshot.data.progress.page / snapshot.data.progress.pages * 100 : 0
  const selectionStart = selection?.touch?.rects[0] ?? selection?.anchor
  const selectionEnd = selection?.touch?.rects.at(-1) ?? selection?.anchor
  const selectionAbove = Boolean(selectionStart && selectionStart.top >= 66)
  const actionAnchor = selectionAbove ? selectionStart : selectionEnd
  const sameRange = (entry: ReaderEntry, target: ReaderSelection) => entry.highlight && entry.position.kind === 'epub' && target.position.kind === 'epub' && entry.position.cfi === target.position.cfi
  const openSelection = () => {
    if (!selection) return
    const existing = snapshot.data.entries.find(entry => sameRange(entry, selection))
    setPanel({ ids: existing ? [existing.id] : [], selection: existing ? undefined : selection, anchor: selection.anchor, serial: ++serial.current })
    setSelection(null)
  }
  /** Mark the passage without writing anything; a thought can be added later. */
  const highlightSelection = () => {
    if (!selection) return
    if (snapshot.data.entries.some(entry => sameRange(entry, selection)) || snapshot.data.entries.length >= 500) { openSelection(); return }
    const entry: ReaderEntry = { id: crypto.randomUUID(), position: selection.position, quote: selection.quote.slice(0, 2000), note: '', highlight: true, ...(selection.rects ? { rects: selection.rects } : {}) }
    session.update(data => ({ ...data, entries: [...data.entries, entry] }))
    clearReaderSelection()
    setSelection(null)
  }
  const copySelection = () => {
    if (!selection) return
    void navigator.clipboard?.writeText(selection.quote).catch(() => undefined)
    clearReaderSelection()
    setSelection(null)
  }
  // Touch browsers may skip the click after a prevented pointerdown, so act on
  // pointerup and ignore the click that follows it.
  const press = (action: () => void) => ({
    onPointerUp: (event: React.PointerEvent) => { event.preventDefault(); pressedAt.current = performance.now(); action() },
    onClick: () => { if (performance.now() - pressedAt.current > 500) action() },
  })
  return <ReaderContext.Provider value={{ session, snapshot, selection, setSelection, openNotes, loginHref }}>
    <div className="reader-workspace" key={snapshot.generation}>{children}</div>
    <div className="reader-progress" aria-label={`阅读进度 ${positionLabel(snapshot.data.progress)}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" /><circle className="reader-progress-fill" cx="8" cy="8" r="6" pathLength="100" strokeDasharray={`${percent} 100`} /></svg>
      <span>{positionLabel(snapshot.data.progress)}</span>
      <ReaderSyncIssue />
    </div>
    {selection?.touch && !panel && <SelectionOverlay selection={selection} />}
    {selection && !panel && <div className="reader-selection-action" role="toolbar" aria-label="选中文字" data-placement={selectionAbove ? 'above' : 'below'} style={{ left: Math.max(112, Math.min(window.innerWidth - 112, (actionAnchor!.left + actionAnchor!.right) / 2)), top: selectionAbove ? selectionStart!.top - 54 : Math.min(window.innerHeight - 56, selectionEnd!.bottom + 10) }} onPointerDown={event => event.preventDefault()}>
      <button type="button" aria-label="写批注" {...press(openSelection)}><PenLine size={14} strokeWidth={1.7} /><span>批注</span></button>
      <button type="button" aria-label="划线" {...press(highlightSelection)}><Highlighter size={14} strokeWidth={1.7} /><span>划线</span></button>
      <button type="button" aria-label="复制" {...press(copySelection)}><Copy size={14} strokeWidth={1.7} /><span>复制</span></button>
    </div>}
    {panel && <AnnotationCard key={panel.serial} panel={panel} onClose={() => { setPanel(null); setSelection(null) }} />}
  </ReaderContext.Provider>
}

function SelectionOverlay({ selection }: { selection: ReaderSelection }) {
  const touch = selection.touch!
  const first = touch.rects[0], last = touch.rects.at(-1)
  return <div className="reader-selection-overlay" aria-hidden="true">
    {touch.rects.map((rect, index) => <span key={index} className="reader-selected-text" style={{ left: rect.left, top: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top }} />)}
    {first && last && (['start', 'end'] as const).map(edge => {
      const rect = edge === 'start' ? first : last
      return <span key={edge} data-edge={edge} className="reader-selection-handle" style={{ left: (edge === 'start' ? rect.left : rect.right) - 18, top: (edge === 'start' ? rect.top : rect.bottom) - 18 }} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) { event.preventDefault(); touch.adjust(edge, event.clientX, event.clientY) } }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} />
    })}
  </div>
}

export function ReaderAccount() {
  const { session, snapshot, loginHref } = useReaderWorkspace()
  return snapshot.account && snapshot.status !== 'error'
    ? <div className="reader-account" title={snapshot.account}><UserRound size={16} /><span>{snapshot.account}</span></div>
    : <a className="reader-login" href={loginHref} onClick={() => session.prepareLogin()}><UserRound size={16} /><span>登录</span></a>
}

export function ParagraphNotes({ markers }: { markers: NoteMarker[] }) {
  const { openNotes } = useReaderWorkspace()
  return <div className="reader-margin-notes">{markers.map(marker => <button key={marker.ids.join(',')} type="button" className="reader-margin-note" aria-label={marker.ids.length > 1 ? `查看 ${marker.ids.length} 条批注` : '查看批注'} style={{ left: marker.x - 14, top: marker.y - 14 }} onClick={event => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    openNotes(marker.ids, rect)
  }}><MessageCircle size={12} strokeWidth={1.5} />{marker.ids.length > 1 && <small>{marker.ids.length}</small>}</button>)}</div>
}

export type DrawerTab = 'contents' | 'notes'

/** Switches the reader's side drawer between the table of contents and the notes of the whole book. */
export function DrawerTabs({ tab, onTab, notes }: { tab: DrawerTab; onTab: (tab: DrawerTab) => void; notes: number }) {
  return <div className="reader-drawer-tabs" role="tablist" aria-label="目录与批注">
    <button type="button" role="tab" aria-selected={tab === 'contents'} onClick={() => onTab('contents')}>目录</button>
    <button type="button" role="tab" aria-selected={tab === 'notes'} onClick={() => onTab('notes')}>批注{notes > 0 && <small>{notes}</small>}</button>
  </div>
}

export interface NoteListItem { entry: ReaderEntry; where: string }

/** Every highlight and note in the book, in reading order; choosing one jumps to it. */
export function NotesList({ items, onSelect }: { items: NoteListItem[]; onSelect: (entry: ReaderEntry) => void }) {
  if (!items.length) return <p className="reader-notes-empty">还没有批注。选中文字后可以划线，或写下想法。</p>
  return <ul className="reader-notes-list" aria-label="全书批注">{items.map(({ entry, where }) => <li key={entry.id}>
    <button type="button" onClick={() => onSelect(entry)}>
      {where && <span className="reader-notes-where">{where}</span>}
      <span className="reader-notes-quote">{entry.quote}</span>
      {entry.note && <span className="reader-notes-note">{entry.note}</span>}
    </button>
  </li>)}</ul>
}

function AnnotationCard({ panel, onClose }: { panel: NotePanel; onClose: () => void }) {
  const { session, snapshot, loginHref } = useReaderWorkspace()
  const dialog = useRef<HTMLDialogElement>(null)
  const backdropPressed = useRef(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const [editId, setEditId] = useState<string | null>(panel.selection ? 'new' : null)
  const [draft, setDraft] = useState('')
  const [original, setOriginal] = useState('')
  const [error, setError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const entries = snapshot.data.entries.filter(entry => panel.ids.includes(entry.id))
  const editing = entries.find(entry => entry.id === editId)
  const quote = panel.selection?.quote ?? editing?.quote ?? ''
  const dirty = Boolean(editId) && draft.trim() !== '' && draft.trim() !== original.trim()
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

  useEffect(() => {
    dialog.current?.showModal()
    if (panel.selection) input.current?.focus({ preventScroll: true })
    else dialog.current?.focus({ preventScroll: true })
    return () => dialog.current?.close()
  }, [])

  // Desktop: a popover beside the passage, flipped above it when there is no
  // room below. Phones: a bottom sheet that stays above the on-screen keyboard
  // (iOS overlays the keyboard on fixed elements instead of resizing the page).
  useLayoutEffect(() => {
    const card = dialog.current
    if (!card) return
    const viewport = window.visualViewport
    const place = () => {
      const keyboard = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0
      card.style.setProperty('--note-keyboard', `${keyboard}px`)
      if (window.matchMedia('(max-width: 640px)').matches) return
      const { width, height } = card.getBoundingClientRect()
      const anchor = panel.anchor
      const below = anchor.bottom + 10
      const above = anchor.top - height - 10
      const top = below + height <= window.innerHeight - 12 ? below : above >= 12 ? above : Math.max(12, window.innerHeight - height - 12)
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, (anchor.left + anchor.right) / 2 - width / 2))
      card.style.setProperty('--note-top', `${Math.round(top)}px`)
      card.style.setProperty('--note-left', `${Math.round(left)}px`)
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(card)
    window.addEventListener('resize', place)
    viewport?.addEventListener('resize', place)
    viewport?.addEventListener('scroll', place)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      viewport?.removeEventListener('resize', place)
      viewport?.removeEventListener('scroll', place)
    }
  }, [panel.anchor])

  // The field grows with the text up to its CSS max-height.
  useLayoutEffect(() => {
    const field = input.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [draft, editId])

  useEffect(() => {
    if (!copiedId) return
    const timer = window.setTimeout(() => setCopiedId(null), 1400)
    return () => window.clearTimeout(timer)
  }, [copiedId])

  const startEditing = (entry: ReaderEntry) => {
    setEditId(entry.id)
    setDraft(entry.note)
    setOriginal(entry.note)
    setConfirmDelete(null)
  }
  // Entering the editor for an existing note: focus with the caret at the end,
  // before the browser paints, so typing straight away appends.
  useLayoutEffect(() => {
    const field = input.current
    if (!field || !editId || editId === 'new') return
    field.focus({ preventScroll: true })
    field.setSelectionRange(field.value.length, field.value.length)
  }, [editId])
  /** Leave the editor: back to the note when editing one, otherwise close the card. */
  const leaveEditor = () => {
    setConfirmDiscard(false)
    setError('')
    if (editing) setEditId(null)
    else onClose()
  }
  const requestClose = () => {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }
  const save = () => {
    if (!draft.trim()) return
    if (panel.selection && snapshot.data.entries.length >= 500) { setError('批注已达上限，请先整理已有批注。'); return }
    if (panel.selection) {
      const entry: ReaderEntry = { id: crypto.randomUUID(), position: panel.selection.position, quote: panel.selection.quote.slice(0, 2000), note: draft.trim(), highlight: true, ...(panel.selection.rects ? { rects: panel.selection.rects } : {}) }
      session.update(data => ({ ...data, entries: [...data.entries, entry] }))
    } else if (editing) session.update(data => ({ ...data, entries: data.entries.map(entry => entry.id === editing.id ? { ...entry, note: draft.trim() } : entry) }))
    onClose()
  }
  const remove = (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    session.update(data => ({ ...data, entries: data.entries.filter(entry => entry.id !== id) }))
    setConfirmDelete(null)
    if (entries.length <= 1) onClose()
    else setEditId(null)
  }
  const copy = (entry: ReaderEntry) => {
    const text = entry.note ? `${entry.quote}\n\n${entry.note}` : entry.quote
    void navigator.clipboard?.writeText(text).then(() => setCopiedId(entry.id)).catch(() => undefined)
  }
  const deleteButton = (id: string) => (
    <button type="button" className="reader-note-delete" data-confirming={confirmDelete === id || undefined} aria-label={confirmDelete === id ? '确认删除批注' : '删除批注'} onClick={() => remove(id)} onBlur={() => setConfirmDelete(null)}>
      <Trash2 size={14} />{confirmDelete === id && <span>确认删除</span>}
    </button>
  )
  const title = panel.selection ? '写批注' : editId ? '编辑批注' : entries.length > 0 && entries.every(entry => !entry.note) ? '划线' : entries.length > 1 ? `${entries.length} 条批注` : '批注'

  return <dialog ref={dialog} tabIndex={-1} className="reader-annotation-card" aria-label="段落批注" onCancel={event => { event.preventDefault(); requestClose() }} onPointerDown={event => { backdropPressed.current = event.target === event.currentTarget }} onClick={event => { if (backdropPressed.current && event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) requestClose() } }}>
    <header className="reader-note-header"><span>{title}</span>
      <button type="button" className="reader-note-close" aria-label="关闭批注" onClick={requestClose}><X size={16} /></button>
    </header>
    {editId ? <>
      <blockquote>{quote}</blockquote>
      <textarea ref={input} aria-label="批注内容" autoFocus rows={3} value={draft} onChange={event => { setDraft(event.target.value); setError('') }} onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); save() } }} maxLength={5000} placeholder="写批注…" />
      {error && <p className="reader-note-error" role="alert">{error}</p>}
      {confirmDiscard
        ? <footer className="reader-note-footer reader-note-discard" role="alert"><span>放弃未保存的内容？</span><div className="reader-note-buttons">
          <button type="button" className="reader-note-quiet" onClick={() => { setConfirmDiscard(false); input.current?.focus({ preventScroll: true }) }}>继续编辑</button>
          <button type="button" className="reader-note-danger" onClick={onClose}>放弃</button>
        </div></footer>
        : <footer className="reader-note-footer">
          {editing ? deleteButton(editing.id) : <span className="reader-note-hint">{shortcut} + Enter 保存</span>}
          <div className="reader-note-buttons">
            <button type="button" className="reader-note-quiet" onClick={() => { if (dirty) setConfirmDiscard(true); else leaveEditor() }}>取消</button>
            <button type="button" className="reader-note-done" disabled={!draft.trim()} onClick={save} aria-label="保存批注">保存</button>
          </div>
        </footer>}
    </> : <>
      <div className="reader-note-thread">{entries.map(entry => <article key={entry.id}>
        <blockquote>{entry.quote}</blockquote>
        {entry.note && <p>{entry.note}</p>}
        <div className="reader-note-row">
          <button type="button" className="reader-note-edit" aria-label="编辑批注" onClick={() => startEditing(entry)}><PenLine size={14} /><span>{entry.note ? '编辑' : '写想法'}</span></button>
          <button type="button" className="reader-note-edit" aria-label="复制批注" onClick={() => copy(entry)}>{copiedId === entry.id ? <Check size={14} /> : <Copy size={14} />}<span>{copiedId === entry.id ? '已复制' : '复制'}</span></button>
          {deleteButton(entry.id)}
        </div>
      </article>)}</div>
      {!entries.length && <p className="reader-note-empty">这条批注已被移除。</p>}
      {!snapshot.account && <p className="reader-note-sync">批注目前只保存在这台设备上，<a className="reader-note-login" href={loginHref} onClick={() => session.prepareLogin()}>登录</a>后可跨设备同步。</p>}
    </>}
  </dialog>
}

function ReaderSyncIssue() {
  const { session, snapshot } = useReaderWorkspace()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const issue = snapshot.status === 'error' || snapshot.status === 'conflict' || snapshot.message.includes('不可用')
  useEffect(() => { if (open && issue) dialog.current?.showModal(); else { dialog.current?.close(); setOpen(false) } }, [open, issue])
  if (!issue) return null
  return <>
    <button type="button" className="reader-save-issue" aria-label="查看保存问题" onClick={() => setOpen(true)}><CloudOff size={13} /></button>
    <dialog ref={dialog} className="reader-annotation-card reader-sync-dialog" aria-label="保存问题" onCancel={() => setOpen(false)}>
      <header className="reader-note-header"><span>保存遇到问题</span><button type="button" aria-label="关闭提示" onClick={() => setOpen(false)}><X size={17} /></button></header>
      <p>{snapshot.message}</p>
      <div className="reader-conflict-actions">{snapshot.status === 'conflict' ? <>
        <button type="button" onClick={() => void session.refresh(true)}>使用另一份记录</button>
        <button type="button" onClick={() => void session.keepLocal()}>保留当前记录</button>
      </> : <button type="button" onClick={() => void session.refresh()}>重试保存</button>}</div>
      <ReaderAccount />
    </dialog>
  </>
}
