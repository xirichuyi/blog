import { getAdminSession } from '@/services/admin'
import { ApiError, apiRequest } from '@/services/http'
import { loadReaderProgress, type ReaderProgress } from './book-progress'

export interface NoteRect { x: number; y: number; width: number; height: number }
export interface ReaderEntry {
  id: string
  position: ReaderProgress
  quote: string
  note: string
  highlight: boolean
  rects?: NoteRect[]
}
export interface ReaderData {
  revision: number
  progress: ReaderProgress | null
  entries: ReaderEntry[]
  review: string
  rating: number | null
}
export type SyncStatus = 'loading' | 'local' | 'saved' | 'pending' | 'saving' | 'error' | 'conflict'
export interface ReaderSnapshot {
  ready: boolean
  data: ReaderData
  status: SyncStatus
  message: string
  account: string | null
  generation: number
}
const emptyData = (): ReaderData => ({ revision: 0, progress: null, entries: [], review: '', rating: null })

export function validPosition(value: unknown): value is ReaderProgress {
  if (!value || typeof value !== 'object') return false
  const p = value as ReaderProgress
  return p.kind === 'epub'
    ? typeof p.cfi === 'string' && p.cfi.startsWith('epubcfi(') && p.cfi.endsWith(')') && p.cfi.length <= 4096 && Number.isFinite(p.percent) && p.percent >= 0 && p.percent <= 100
    : p.kind === 'pdf' && Number.isInteger(p.page) && Number.isInteger(p.pages) && p.page >= 1 && p.page <= p.pages && p.pages <= 1_000_000
}
function validData(value: unknown): value is ReaderData {
  if (!value || typeof value !== 'object') return false
  const d = value as ReaderData
  return Number.isSafeInteger(d.revision) && d.revision >= 0 && (d.progress === null || validPosition(d.progress))
    && Array.isArray(d.entries) && d.entries.length <= 500 && d.entries.every(e => e && typeof e.id === 'string' && validPosition(e.position) && typeof e.quote === 'string' && typeof e.note === 'string' && typeof e.highlight === 'boolean' && (e.rects === undefined || (Array.isArray(e.rects) && e.rects.length > 0 && e.rects.length <= 100 && e.rects.every(r => r && [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.x >= 0 && r.y >= 0 && r.width > 0 && r.height > 0 && r.x + r.width <= 1.001 && r.y + r.height <= 1.001))))
    && typeof d.review === 'string' && (d.rating === null || (Number.isInteger(d.rating) && d.rating >= 1 && d.rating <= 5))
}

/** One session per edition; writes are serialized and use server revisions, never device clocks. */
export class ReaderSession {
  private snapshot: ReaderSnapshot = { ready: false, data: emptyData(), status: 'loading', message: '', account: null, generation: 0 }
  private listeners = new Set<() => void>()
  private key = ''
  private dirty = false
  private changed = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private inFlight = false
  private reading = false
  private canSync = false
  private disposed = false
  private storageFailed = false
  private path: string

  constructor(private bookId: number, private fileId: number, private format: string) {
    this.path = `/books/${bookId}/files/${fileId}/reader`
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.snapshot
  getProgress = () => this.snapshot.data.progress
  private publish(patch: Partial<ReaderSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    if (!this.disposed) this.listeners.forEach(listener => listener())
  }
  private persist() {
    try {
      localStorage.setItem(this.key, JSON.stringify({ data: this.snapshot.data, dirty: this.dirty }))
      this.storageFailed = false
    } catch {
      this.storageFailed = true
    }
  }
  private readCache(): { data: ReaderData; dirty: boolean } | null {
    try {
      const cached = JSON.parse(localStorage.getItem(this.key) || 'null')
      return validData(cached?.data) ? { data: cached.data, dirty: cached.dirty === true } : null
    } catch { return null }
  }
  private async request<T>(init?: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try { return await apiRequest<T>(this.path, { ...init, credentials: 'include', headers: { 'X-Reader-Account': this.snapshot.account ?? '' }, signal: controller.signal }) }
    finally { clearTimeout(timeout) }
  }
  prepareLogin() {
    if (!this.snapshot.account) {
      try { sessionStorage.setItem(`reader-login:${this.bookId}:${this.fileId}`, JSON.stringify({ data: this.snapshot.data, at: Date.now() })) } catch { /* Local guest cache still remains. */ }
    }
    void this.flush(true)
  }
  async start() {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      let account
      try { account = await getAdminSession(controller.signal) }
      finally { clearTimeout(timeout) }
      if (this.disposed) return
      if (account && (typeof account.email !== 'string' || !account.email)) throw new Error('Invalid account response')
      this.key = `reader-v2:${account ? encodeURIComponent(account.email) : 'guest'}:${this.bookId}:${this.fileId}`
      const cached = this.readCache()
      // Migrate the old browser-only position once. Cloud data takes precedence below.
      const legacy = loadReaderProgress(this.bookId, this.fileId)
      const data = cached?.data ?? { ...emptyData(), progress: validPosition(legacy) && legacy.kind === this.format ? legacy : null }
      this.dirty = cached?.dirty ?? false
      this.publish({ data, account: account?.email ?? null })
      if (account) {
        await this.refresh()
        try {
          const key = `reader-login:${this.bookId}:${this.fileId}`
          const intent = JSON.parse(sessionStorage.getItem(key) || 'null')
          if (intent && validData(intent.data) && Date.now() - intent.at < 10 * 60 * 1000) {
            const ids = new Set(this.snapshot.data.entries.map(entry => entry.id))
            const entries = [...this.snapshot.data.entries, ...intent.data.entries.filter((entry: ReaderEntry) => !ids.has(entry.id))]
            if (entries.length <= 500) {
              const moved = intent.data.progress && JSON.stringify(intent.data.progress) !== JSON.stringify(this.snapshot.data.progress)
              this.update(data => ({ ...data, entries, progress: intent.data.progress ?? data.progress }))
              if (moved) this.publish({ generation: this.snapshot.generation + 1 })
              sessionStorage.removeItem(key)
            }
          }
        } catch { /* A failed login cannot remove the guest's original cache. */ }
      }
      else this.publish({ ready: true, status: 'local', message: '仅保存在此浏览器；登录后可同步到其他设备' })
      if (this.disposed) return
      window.addEventListener('online', this.onOnline)
      window.addEventListener('focus', this.onFocus)
      window.addEventListener('pagehide', this.onHide)
      document.addEventListener('visibilitychange', this.onVisibility)
      window.addEventListener('storage', this.onStorage)
    } catch {
      this.publish({ status: 'error', message: '无法确认登录状态，请重试' })
    }
  }
  private onOnline = () => { void this.refresh() }
  private onFocus = () => { if (!this.dirty) void this.refresh() }
  private onHide = () => { void this.flush(true) }
  private onVisibility = () => { if (document.visibilityState === 'hidden') this.onHide() }
  private onStorage = (event: StorageEvent) => {
    if (event.key !== this.key) return
    const cached = this.readCache()
    if (!cached) return
    if (this.dirty || this.inFlight) {
      this.canSync = false
      this.publish({ status: 'conflict', message: '另一个页面修改了阅读数据。当前修改尚未同步，请选择要保留的版本。' })
    } else {
      this.dirty = cached.dirty
      this.publish({ data: cached.data, generation: this.snapshot.generation + 1 })
      if (this.snapshot.account) void this.refresh()
    }
  }
  async refresh(discardLocal = false) {
    if (!this.snapshot.account) {
      if (discardLocal) {
        const cached = this.readCache()
        if (cached) { this.dirty = false; this.publish({ data: cached.data, generation: this.snapshot.generation + 1, status: 'local', message: '已读取另一页面的本地版本' }) }
      }
      return
    }
    if (this.inFlight || this.reading || this.disposed) return
    this.reading = true
    try {
      const remote = await this.request<ReaderData>()
      if (this.disposed) return
      if (!validData(remote)) throw new Error('Invalid reader response')
      if (this.dirty && !discardLocal && remote.revision !== this.snapshot.data.revision) {
        this.canSync = false
        this.publish({ ready: true, status: 'conflict', message: '云端已有其他页面或设备保存的新版本。当前修改尚未同步，请选择要保留的版本。' })
        return
      }
      const replace = discardLocal || !this.dirty
      // Import legacy progress only for an account that has never saved this edition.
      const importLegacy = !this.snapshot.ready && remote.revision === 0 && this.snapshot.data.progress && !this.dirty
      this.canSync = true
      if (replace && !importLegacy) {
        const moved = this.snapshot.ready && JSON.stringify(remote.progress) !== JSON.stringify(this.snapshot.data.progress)
        this.dirty = false
        this.publish({ data: remote, generation: this.snapshot.generation + (moved || discardLocal ? 1 : 0) })
      }
      if (importLegacy) this.dirty = true
      this.persist()
      this.publish({ ready: true, status: this.dirty ? 'pending' : 'saved', message: this.dirty ? '等待同步' : '已同步到云端' })
      if (this.dirty) this.schedule()
    } catch {
      this.canSync = false
      this.publish({ ready: true, status: 'error', message: '云端读取失败，暂存本地；恢复连接后请重试同步' })
    } finally { this.reading = false }
  }
  /** Explicit local-wins resolution, still protected against another concurrent server write. */
  async keepLocal() {
    if (!this.snapshot.account) { this.persist(); this.publish({ status: 'local', message: '已保留当前本地版本' }); return }
    if (this.inFlight || this.reading) return
    this.reading = true
    try {
      const remote = await this.request<ReaderData>()
      if (this.disposed || !validData(remote)) return
      this.publish({ data: { ...this.snapshot.data, revision: remote.revision }, status: 'pending', message: '等待同步' })
      this.canSync = true
      this.dirty = true
      this.persist()
      this.schedule()
    } catch { this.publish({ status: 'error', message: '连接失败，本地修改仍保留，请重试' }) }
    finally { this.reading = false }
  }
  update = (change: (data: ReaderData) => ReaderData) => {
    if (!this.snapshot.ready) return
    const data = change(this.snapshot.data)
    if (JSON.stringify(data) === JSON.stringify(this.snapshot.data)) return
    this.changed++
    this.dirty = true
    this.publish({ data })
    this.persist()
    if (!this.snapshot.account) {
      this.publish({ status: 'local', message: this.storageFailed ? '浏览器存储不可用，关闭页面会丢失修改' : '已保存在此浏览器；登录后可跨设备同步' })
    } else if (this.canSync && this.getSnapshot().status !== 'conflict') {
      this.publish({ status: 'pending', message: '等待同步' })
      this.schedule()
    }
  }
  saveProgress = (progress: ReaderProgress) => {
    if (validPosition(progress)) this.update(data => ({ ...data, progress }))
  }
  private schedule() {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { void this.flush() }, 800)
  }
  async flush(keepalive = false) {
    clearTimeout(this.timer)
    if (!this.dirty || !this.canSync || this.inFlight || this.reading || !this.snapshot.account || this.snapshot.status === 'conflict') return
    this.inFlight = true
    const version = this.changed
    const data = this.snapshot.data
    this.publish({ status: 'saving', message: '正在同步…' })
    try {
      const body = JSON.stringify(data)
      const saved = await this.request<ReaderData>({ method: 'PUT', body, keepalive: keepalive && new Blob([body]).size < 60000 })
      if (!validData(saved)) throw new Error('Invalid reader response')
      // Preserve edits made while this request was in flight, updating only their base revision.
      this.dirty = version !== this.changed
      this.publish({ data: { ...this.snapshot.data, revision: saved.revision } })
      // Do not overwrite another tab's local cache after it raised a conflict.
      if (this.getSnapshot().status !== 'conflict') {
        this.persist()
        this.publish({ status: this.dirty ? 'pending' : 'saved', message: this.dirty ? '等待同步' : '已同步到云端' })
      }
    } catch (error) {
      this.canSync = false
      this.publish(error instanceof ApiError && error.status === 409
        ? { status: 'conflict', message: '其他页面或设备保存了新版本；本地修改未覆盖云端，请选择要保留的版本。' }
        : { status: 'error', message: this.storageFailed ? '同步失败且本地存储不可用，请勿关闭页面' : '同步失败，修改已暂存本地，请重试' })
    } finally {
      this.inFlight = false
      if (this.dirty && this.canSync && this.getSnapshot().status !== 'conflict') {
        if (this.disposed) void this.flush(true)
        else this.schedule()
      }
    }
  }
  dispose() {
    void this.flush(true)
    this.disposed = true
    clearTimeout(this.timer)
    window.removeEventListener('online', this.onOnline)
    window.removeEventListener('focus', this.onFocus)
    window.removeEventListener('pagehide', this.onHide)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('storage', this.onStorage)
  }
}
