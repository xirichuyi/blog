import type { Contents, Location } from 'epubjs'
import { apiRequest, apiUrl } from '@/services/http'

export interface EpubManifest {
  version: string
  package: string
  cacheable: boolean
  sections: { path: string; size: number; linear: boolean }[]
}

const memory = new Map<string, string>()
const pending = new Map<string, Promise<string>>()
const MAX_CHAPTER = 512 * 1024
const MAX_CACHED = 32
let database: Promise<IDBDatabase | null> | undefined

function chapterDatabase() {
  database ??= new Promise<IDBDatabase | null>(resolve => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    const request = indexedDB.open('reader-chapters-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('chapters', { keyPath: 'url' }).createIndex('updated', 'updated')
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  }).catch(() => null)
  return database
}

async function cachedChapter(url: string): Promise<string | undefined> {
  const db = await chapterDatabase()
  if (!db) return undefined
  return new Promise<string | undefined>(resolve => {
    const request = db.transaction('chapters').objectStore('chapters').get(url)
    request.onsuccess = () => resolve(request.result?.text)
    request.onerror = () => resolve(undefined)
  }).catch(() => undefined)
}

async function storeChapter(url: string, text: string) {
  if (text.length > MAX_CHAPTER || new Blob([text]).size > MAX_CHAPTER) return
  const db = await chapterDatabase()
  if (!db) return
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('chapters', 'readwrite')
    const store = transaction.objectStore('chapters')
    store.put({ url, text, updated: Date.now() })
    const count = store.count()
    count.onsuccess = () => {
      let excess = count.result - MAX_CACHED
      if (excess <= 0) return
      const cursor = store.index('updated').openKeyCursor()
      cursor.onsuccess = () => {
        if (!cursor.result || excess-- <= 0) return
        store.delete(cursor.result.primaryKey)
        cursor.result.continue()
      }
    }
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  }).catch(() => undefined)
}

function remember(url: string, text: string) {
  memory.delete(url)
  if (text.length > MAX_CHAPTER) return
  memory.set(url, text)
  while (memory.size > 8) memory.delete(memory.keys().next().value!)
}

async function chapterText(url: string, persistent: boolean): Promise<string> {
  const known = memory.get(url)
  if (known !== undefined) { remember(url, known); return known }
  const loading = pending.get(url)
  if (loading) return loading
  const job = (async () => {
    const cached = persistent ? await cachedChapter(url) : undefined
    if (cached !== undefined) {
      remember(url, cached)
      void storeChapter(url, cached)
      return cached
    }
    const response = await fetch(url, { credentials: 'include', signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error(`章节加载失败 (${response.status})，请重试`)
    const text = await response.text()
    remember(url, text)
    if (persistent) void storeChapter(url, text)
    return text
  })()
  pending.set(url, job)
  try { return await job } finally { pending.delete(url) }
}

export async function openEpubStream(bookId: number, fileId: number, signal: AbortSignal) {
  const manifest = await apiRequest<EpubManifest>(`/books/${bookId}/files/${fileId}/epub`, { signal, credentials: 'include' })
  if (!manifest?.version || !manifest.package || !manifest.sections?.length) throw new Error('章节索引无效，请重试')
  const base = new URL(apiUrl(`/books/${bookId}/files/${fileId}/epub/${manifest.version}/`), window.location.href)
  const resourceUrl = (path: string) => new URL(path.split('/').map(encodeURIComponent).join('/'), base).href
  const chapterUrls = new Set(manifest.sections.map(section => resourceUrl(section.path)))
  const request = async (url: string, type?: string): Promise<object> => {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const resolved = new URL(url, base).href
    if (!resolved.startsWith(base.href)) throw new Error('书籍资源地址无效')
    const text = await chapterText(resolved, manifest.cacheable && chapterUrls.has(resolved))
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const extension = type || new URL(resolved).pathname.split('.').at(-1)
    if (extension === 'json') return JSON.parse(text) as object
    const mime = extension === 'html' || extension === 'htm' ? 'text/html' : 'application/xml'
    const doc = new DOMParser().parseFromString(text, mime)
    if (doc.querySelector('parsererror')) throw new Error('章节格式无法解析')
    return doc
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  let prefetching = false
  let latestIndex = -1
  const prefetch = (index: number) => {
    latestIndex = index
    clearTimeout(timer)
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (signal.aborted || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) return
    timer = setTimeout(async () => {
      if (prefetching || signal.aborted) return
      prefetching = true
      try {
        for (const offset of [1, 2, -1]) {
          if (signal.aborted || latestIndex !== index) break
          const section = manifest.sections[index + offset]
          if (section?.linear && section.size <= MAX_CHAPTER) await chapterText(resourceUrl(section.path), manifest.cacheable).catch(() => undefined)
        }
      } finally { prefetching = false }
    }, 250)
  }
  signal.addEventListener('abort', () => clearTimeout(timer), { once: true })
  return { manifest, packageUrl: resourceUrl(manifest.package), request, prefetch }
}

export class EpubProgressIndex {
  private prefix: number[] = [0]
  private weights: number[]
  private documents = new WeakMap<Document, { offsets: WeakMap<Node, number>; total: number }>()

  constructor(manifest: EpubManifest) {
    this.weights = manifest.sections.map(section => section.linear ? Math.max(0, section.size) : 0)
    for (const size of this.weights) this.prefix.push(this.prefix.at(-1)! + size)
  }

  percent(location: Location, contents?: Contents): number {
    if (location.atEnd) return 100
    const index = location.start.index
    const total = this.prefix.at(-1)!
    if (!total || index < 0 || index >= this.weights.length) throw new Error('阅读位置不在章节索引内')
    let fraction = 0
    if (contents) {
      try {
        const document = contents.document
        let text = this.documents.get(document)
        if (!text) {
          text = { offsets: new WeakMap(), total: 0 }
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: node => node.parentElement?.closest('script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
          })
          let node: Node | null
          while ((node = walker.nextNode())) { text.offsets.set(node, text.total); text.total += node.textContent?.length ?? 0 }
          this.documents.set(document, text)
        }
        const range = contents.range(location.start.cfi)
        const before = text.offsets.get(range.startContainer)
        if (before !== undefined && text.total) fraction = (before + range.startOffset) / text.total
      } catch { /* Section start remains a usable estimate while its frame is relocating. */ }
    }
    return Math.round((this.prefix[index] + this.weights[index] * Math.max(0, Math.min(1, fraction))) / total * 10000) / 100
  }
}
