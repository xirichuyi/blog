import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { BookmarkPlus, NotebookPen, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ReaderSession, type ReaderEntry, type ReaderSnapshot } from '@/lib/reader-state'
import type { ReaderProgress } from '@/lib/book-progress'
import type { BookFile } from '@/services/api'

interface Selection { position: ReaderProgress; quote: string }
interface ReaderContextValue {
  session: ReaderSession
  snapshot: ReaderSnapshot
  selection: Selection | null
  setSelection: (selection: Selection | null) => void
  jump: { position: ReaderProgress; id: number } | null
  navigate: (position: ReaderProgress) => void
}
const ReaderContext = createContext<ReaderContextValue | null>(null)
export function useReaderWorkspace() {
  const value = useContext(ReaderContext)
  if (!value) throw new Error('ReaderWorkspace is required')
  return value
}
export function positionLabel(position: ReaderProgress | null) {
  return !position ? '正在定位' : position.kind === 'pdf' ? `第 ${position.page} / ${position.pages} 页` : `${Math.round(position.percent)}%`
}

export function ReaderWorkspace({ bookId, file, children }: { bookId: number; file: BookFile; children: ReactNode }) {
  const [session, setSession] = useState<ReaderSession | null>(null)
  useEffect(() => {
    const next = new ReaderSession(bookId, file.id, file.format.toLowerCase())
    setSession(next)
    void next.start()
    return () => next.dispose()
  }, [bookId, file.id, file.format])
  return session ? <WorkspaceSession session={session}>{children}</WorkspaceSession> : <div className="reader-route-state">正在恢复阅读数据…</div>
}

function WorkspaceSession({ session, children }: { session: ReaderSession; children: ReactNode }) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [jump, setJump] = useState<{ position: ReaderProgress; id: number; generation: number } | null>(null)
  const navigate = (position: ReaderProgress) => {
    setSelection(null)
    setJump(previous => ({ position, id: (previous?.id ?? 0) + 1, generation: snapshot.generation }))
  }
  if (!snapshot.ready) return <div className="reader-route-state" role="status">
    <span>{snapshot.message || '正在恢复阅读数据…'}</span>
    {snapshot.status === 'error' && <button type="button" onClick={() => void session.start()}>重试</button>}
  </div>
  return <ReaderContext.Provider value={{ session, snapshot, selection, setSelection, jump: jump?.generation === snapshot.generation ? jump : null, navigate }}>
    <div className="reader-workspace" key={snapshot.generation}>{children}</div>
    <ReaderNotes />
  </ReaderContext.Provider>
}

function ReaderNotes() {
  const { session, snapshot, selection, setSelection, navigate } = useReaderWorkspace()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const data = snapshot.data
  useEffect(() => {
    if (open) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [open])
  const add = (highlight: boolean) => {
    const position = highlight ? selection?.position : data.progress
    if (!position) return
    if (data.entries.length >= 500) { setNotice('本书最多保存 500 条标记，请先整理已有标记。'); return }
    const duplicate = data.entries.find(e => e.highlight === highlight && (e.position.kind === 'epub' && position.kind === 'epub' ? e.position.cfi === position.cfi : e.position.kind === 'pdf' && position.kind === 'pdf' && e.position.page === position.page))
    if (duplicate) { setNotice('此位置已经标记，可在下方编辑笔记。'); return }
    const entry: ReaderEntry = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      position, quote: highlight ? (selection?.quote ?? '').slice(0, 2000) : '', note: '', highlight,
    }
    session.update(current => ({ ...current, entries: [...current.entries, entry] }))
    setNotice(highlight ? '已添加高亮，可在下方记录想法。' : '已添加书签，可在下方记录想法。')
    if (highlight) setSelection(null)
    setOpen(true)
  }
  const retry = () => void session.refresh()
  return <>
    <div className="reader-notes-launcher">
      {selection && <button type="button" className="reader-selection-action" onClick={() => add(true)}>高亮选中文字</button>}
      <button type="button" aria-label="书签、笔记与书评" onClick={() => setOpen(true)}><NotebookPen size={18} /><span>{positionLabel(data.progress)}</span></button>
      <span role="status" className={`reader-sync-status is-${snapshot.status}`}>
        {snapshot.status === 'error' || snapshot.status === 'conflict' ? <button type="button" onClick={() => setOpen(true)}>{snapshot.status === 'conflict' ? '同步冲突' : '同步失败'} · 查看</button> : snapshot.message}
      </span>
    </div>
    <dialog ref={dialogRef} className="reader-notes-dialog" aria-label="书签、笔记与书评" onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setOpen(false) } }}>
      <div className="reader-notes-header"><h2>书签、笔记与书评</h2><button type="button" aria-label="关闭笔记" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <p className="reader-sync-detail" role="status">{snapshot.message}</p>
      {!snapshot.account && <Link to="/admin">登录以启用云端同步</Link>}
      {snapshot.status === 'error' && <button type="button" onClick={retry}>重试同步</button>}
      {snapshot.status === 'conflict' && <div className="reader-conflict-actions">
        <button type="button" onClick={() => void session.refresh(true)}>{snapshot.account ? '使用云端版本，放弃本地修改' : '使用另一页面的本地版本'}</button>
        <button type="button" onClick={() => void session.keepLocal()}>{snapshot.account ? '用当前版本覆盖云端' : '保留当前本地版本'}</button>
      </div>}
      <div className="reader-note-actions">
        <button type="button" disabled={!data.progress} onClick={() => add(false)}><BookmarkPlus size={18} />添加当前位置书签</button>
        {selection && <button type="button" onClick={() => add(true)}>高亮并记录选中文字</button>}
      </div>
      <p className="reader-note-help">EPUB 长按选中文字后可高亮批注。PDF 支持页码书签和页面笔记。内容仅对当前账号可见。</p>
      {notice && <p role="status">{notice}</p>}
      <ol className="reader-entry-list">
        {data.entries.map(entry => <li key={entry.id}>
          <div className="reader-entry-heading"><button type="button" onClick={() => { navigate(entry.position); setOpen(false) }}>{entry.highlight ? '高亮' : '书签'} · {positionLabel(entry.position)} · 跳转</button><button type="button" aria-label="删除标记" onClick={() => session.update(current => ({ ...current, entries: current.entries.filter(item => item.id !== entry.id) }))}>删除</button></div>
          {entry.quote && <blockquote>{entry.quote}</blockquote>}
          <label>笔记<textarea aria-label={`笔记 ${entry.id}`} value={entry.note} maxLength={5000} placeholder="记录想法（自动保存）" onChange={event => { const note = event.target.value; session.update(current => ({ ...current, entries: current.entries.map(item => item.id === entry.id ? { ...item, note } : item) })) }} /></label>
        </li>)}
      </ol>
      {!data.entries.length && <p>还没有标记。</p>}
      <section className="reader-review"><h3>此版本书评</h3>
        <label>评分<select aria-label="图书评分" value={data.rating ?? ''} onChange={event => { const rating = event.target.value ? Number(event.target.value) : null; session.update(current => ({ ...current, rating })) }}><option value="">未评分</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} 星</option>)}</select></label>
        <label>书评<textarea aria-label="书评" value={data.review} maxLength={5000} placeholder="写下读后感（自动保存）" onChange={event => { const review = event.target.value; session.update(current => ({ ...current, review })) }} /></label>
      </section>
    </dialog>
  </>
}
