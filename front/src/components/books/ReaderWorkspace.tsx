import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CloudOff, MessageCircle, PenLine, Trash2, UserRound, X } from 'lucide-react'
import { ReaderSession, type ReaderEntry, type ReaderSnapshot, type NoteRect } from '@/lib/reader-state'
import type { ReaderProgress } from '@/lib/book-progress'
import type { NoteAnchor, NoteMarker } from '@/lib/reader-annotations'
import { googleLoginUrl } from '@/services/admin'
import type { BookFile } from '@/services/api'

export interface ReaderSelection { position: ReaderProgress; quote: string; anchor: NoteAnchor; rects?: NoteRect[] }
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
  const openNotes = useCallback((ids: string[], anchor: NoteAnchor) => {
    setSelection(null)
    setPanel({ ids, anchor, serial: ++serial.current })
  }, [])
  useEffect(() => {
    if (!panel) return
    window.getSelection()?.removeAllRanges()
    document.querySelectorAll<HTMLIFrameElement>('.epub-viewport iframe').forEach(frame => {
      try { frame.contentWindow?.getSelection()?.removeAllRanges() } catch { /* Unavailable chapter. */ }
    })
  }, [panel])
  if (!snapshot.ready) return <div className="reader-route-state" role="status">
    <span>{snapshot.message || '正在打开…'}</span>
    {snapshot.status === 'error' && <button type="button" onClick={() => void session.start()}>重试</button>}
  </div>
  const percent = snapshot.data.progress?.kind === 'epub' ? snapshot.data.progress.percent : snapshot.data.progress ? snapshot.data.progress.page / snapshot.data.progress.pages * 100 : 0
  const openSelection = () => {
    if (!selection) return
    const existing = snapshot.data.entries.find(entry => entry.highlight && entry.position.kind === 'epub' && selection.position.kind === 'epub' && entry.position.cfi === selection.position.cfi)
    setPanel({ ids: existing ? [existing.id] : [], selection: existing ? undefined : selection, anchor: selection.anchor, serial: ++serial.current })
    setSelection(null)
  }
  return <ReaderContext.Provider value={{ session, snapshot, selection, setSelection, openNotes, loginHref }}>
    <div className="reader-workspace" key={snapshot.generation}>{children}</div>
    <div className="reader-progress" aria-label={`阅读进度 ${positionLabel(snapshot.data.progress)}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" /><circle className="reader-progress-fill" cx="8" cy="8" r="6" pathLength="100" strokeDasharray={`${percent} 100`} /></svg>
      <span>{positionLabel(snapshot.data.progress)}</span>
      <ReaderSyncIssue />
    </div>
    {selection && !panel && <button className="reader-selection-action" type="button" style={{ left: Math.max(72, Math.min(window.innerWidth - 72, (selection.anchor.left + selection.anchor.right) / 2)), top: Math.min(window.innerHeight - 72, Math.max(12, selection.anchor.bottom + 10)) }} onPointerDown={event => event.preventDefault()} onPointerUp={event => { event.preventDefault(); openSelection() }} onClick={openSelection}><PenLine size={15} />写批注</button>}
    {panel && <AnnotationCard key={panel.serial} panel={panel} onClose={() => { setPanel(null); setSelection(null) }} />}
  </ReaderContext.Provider>
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
  }}><MessageCircle size={14} strokeWidth={1.6} />{marker.ids.length > 1 && <small>{marker.ids.length}</small>}</button>)}</div>
}

function AnnotationCard({ panel, onClose }: { panel: NotePanel; onClose: () => void }) {
  const { session, snapshot, loginHref } = useReaderWorkspace()
  const dialog = useRef<HTMLDialogElement>(null)
  const backdropPressed = useRef(false)
  const [editId, setEditId] = useState<string | null>(panel.selection ? 'new' : null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const entries = snapshot.data.entries.filter(entry => panel.ids.includes(entry.id))
  const editing = entries.find(entry => entry.id === editId)
  const quote = panel.selection?.quote ?? editing?.quote ?? ''
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close() }, [])
  const save = () => {
    if (!draft.trim()) return
    if (panel.selection && snapshot.data.entries.length >= 500) { setError('批注已达上限，请先整理已有批注。'); return }
    if (panel.selection) {
      const entry: ReaderEntry = { id: crypto.randomUUID(), position: panel.selection.position, quote: panel.selection.quote.slice(0, 2000), note: draft.trim(), highlight: true, ...(panel.selection.rects ? { rects: panel.selection.rects } : {}) }
      session.update(data => ({ ...data, entries: [...data.entries, entry] }))
    } else if (editing) session.update(data => ({ ...data, entries: data.entries.map(entry => entry.id === editing.id ? { ...entry, note: draft.trim() } : entry) }))
    onClose()
  }
  return <dialog ref={dialog} className="reader-annotation-card" aria-label="段落批注" style={{ '--note-left': `${Math.max(12, Math.min(window.innerWidth - 352, panel.anchor.right - 320))}px`, '--note-top': `${Math.max(20, Math.min(window.innerHeight - 360, panel.anchor.bottom + 12))}px` } as React.CSSProperties} onCancel={onClose} onPointerDown={event => { backdropPressed.current = event.target === event.currentTarget }} onClick={event => { if (backdropPressed.current && event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose() } }}>
    <header className="reader-note-header"><span>{editId ? '写下想法' : '批注'}</span><button type="button" className="reader-note-close" aria-label="关闭批注" onClick={onClose}><X size={17} /></button></header>
    {editId ? <>
      <blockquote>{quote}</blockquote>
      <textarea aria-label="批注内容" autoFocus value={draft} onChange={event => setDraft(event.target.value)} maxLength={5000} placeholder="这一段，让你想到了什么？" />
      {error && <p className="reader-note-error" role="alert">{error}</p>}
      <footer className="reader-note-footer">
        {editing ? <button type="button" className="reader-note-delete" aria-label="删除批注" onClick={() => { session.update(data => ({ ...data, entries: data.entries.filter(entry => entry.id !== editing.id) })); onClose() }}><Trash2 size={17} /></button> : <span />}
        <button type="button" className="reader-note-done" disabled={!draft.trim()} onClick={save}>保存批注</button>
      </footer>
    </> : <>
      <div className="reader-note-thread">{entries.map(entry => <article key={entry.id}>
        <blockquote>{entry.quote}</blockquote>
        <p>{entry.note || '还没有写下想法。'}</p>
        <button type="button" className="reader-note-edit" aria-label="编辑批注" onClick={() => { setEditId(entry.id); setDraft(entry.note) }}><PenLine size={14} />编辑</button>
      </article>)}</div>
      {!entries.length && <p>这条批注已被移除。</p>}
      {!snapshot.account && <a className="reader-note-login" href={loginHref} onClick={() => session.prepareLogin()}>登录</a>}
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
