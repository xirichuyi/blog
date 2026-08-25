// Admin API client. Authentication is carried by a same-origin HttpOnly cookie.
import type { Category, Tag, About, Book, ChangelogEntry, ReadingStatus } from './api'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const PREFIX = '/api'
export const ADMIN_AUTH_EXPIRED_EVENT = 'blog-admin-auth-expired'

export class AuthError extends Error {}

function authExpired(message: string): never {
  window.dispatchEvent(new Event(ADMIN_AUTH_EXPIRED_EVENT))
  throw new AuthError(message)
}

interface Envelope<T> {
  code: number
  message: string
  data: T
  total?: number
}

/** JSON request against an admin endpoint. Throws AuthError on 401. */
export async function adminRequest<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const res = await fetch(`${API_BASE}${PREFIX}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...((init?.headers as Record<string, string>) ?? {}) },
  })
  if (res.status === 401) {
    authExpired('未授权，请重新登录')
  }
  const body = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok || (typeof body.code === 'number' && body.code >= 400)) {
    throw new Error(body.message || `请求失败 (${res.status})`)
  }
  return body
}

const req = adminRequest

// ---------- types ----------
export const POST_STATUS = { Draft: 0, Published: 1, Deleted: 2, Private: 3 } as const
export type StatusName = keyof typeof POST_STATUS
export const STATUS_NAME: Record<number, StatusName> = { 0: 'Draft', 1: 'Published', 2: 'Deleted', 3: 'Private' }

export interface AdminPost {
  id: number
  title: string
  content: string
  cover_url?: string | null
  category_id?: number | null
  category_name?: string | null
  status: number
  created_at: string
  updated_at?: string
  tags?: Array<{ id: number; name: string }>
}

export interface DashboardStats {
  total_posts: number
  total_categories: number
  total_tags: number
  recent_posts?: Array<{ id: number; title: string; created_at: string; status: number }>
  system_info?: { uptime?: string; memory_usage?: string }
}

// ---------- auth ----------
export interface AdminSession {
  email: string
  name: string
  picture?: string | null
}

export function googleLoginUrl(): string {
  return `${API_BASE}${PREFIX}/auth/google/start`
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const res = await fetch(`${API_BASE}${PREFIX}/auth/session`, { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`无法检查登录状态 (${res.status})`)
  const body = (await res.json()) as Envelope<AdminSession>
  return body.data ?? null
}

export async function logoutAdmin(): Promise<void> {
  const res = await fetch(`${API_BASE}${PREFIX}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`退出失败 (${res.status})`)
}

export async function getDashboard(): Promise<DashboardStats> {
  // dashboard/stats returns the object directly (NOT wrapped).
  const res = await fetch(`${API_BASE}${PREFIX}/admin/dashboard/stats`, {
    credentials: 'include',
  })
  if (res.status === 401) {
    authExpired('未授权')
  }
  if (!res.ok) throw new Error(`请求失败 (${res.status})`)
  return (await res.json()) as DashboardStats
}

// ---------- posts ----------
interface RawDetail {
  post: AdminPost
  tags?: Array<{ id: number; name: string }>
  category_name?: string | null
}

/** List ALL posts (incl. drafts) — omit status. */
export async function adminListPosts(): Promise<AdminPost[]> {
  const env = await req<RawDetail[]>(`/admin/posts?page=1&page_size=500`)
  return (env.data || []).map((d) => ({
    ...d.post,
    tags: d.tags ?? d.post.tags,
    category_name: d.category_name ?? d.post.category_name,
  }))
}

export async function adminGetPost(id: number | string): Promise<AdminPost> {
  const env = await req<AdminPost>(`/admin/posts/${id}`)
  const post = env.data
  if (!post.tags) {
    try {
      const t = await req<Array<{ id: number; name: string }>>(`/post/get_tags/${id}`)
      post.tags = t.data || []
    } catch {
      /* tags optional */
    }
  }
  return post
}

export interface PostPayload {
  title: string
  content: string
  cover_url?: string | null
  category_id?: number | null
  status: number
  tag_ids?: number[]
}

export async function createPost(p: PostPayload): Promise<AdminPost> {
  const env = await req<AdminPost>(`/post/create`, { method: 'POST', body: JSON.stringify(p) })
  return env.data
}
export async function updatePost(id: number, p: Partial<PostPayload>): Promise<AdminPost> {
  const env = await req<AdminPost>(`/post/update/${id}`, { method: 'PUT', body: JSON.stringify(p) })
  return env.data
}
export async function deletePost(id: number): Promise<void> {
  await req(`/post/delete/${id}`, { method: 'DELETE' })
}
// ---------- books ----------
export interface BookPayload {
  title: string
  author: string
  description: string
  cover_url?: string | null
  reading_status: ReadingStatus
  progress: number
  rating?: number | null
  notes: string
  started_at?: string | null
  finished_at?: string | null
  is_public: boolean
}

export async function adminListBooks(): Promise<Book[]> {
  const env = await req<Book[]>('/admin/books')
  return env.data || []
}

export async function createBook(payload: BookPayload): Promise<Book> {
  const env = await req<Book>('/admin/books', { method: 'POST', body: JSON.stringify(payload) })
  return env.data
}

export async function updateBook(id: number, payload: Partial<BookPayload>): Promise<Book> {
  const env = await req<Book>(`/admin/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  return env.data
}

export async function deleteBook(id: number): Promise<void> {
  await req(`/admin/books/${id}`, { method: 'DELETE' })
}

export async function deleteBookFile(fileId: number): Promise<void> {
  await req(`/admin/books/files/${fileId}`, { method: 'DELETE' })
}

// ---------- changelog ----------
export interface ChangelogPayload {
  version: string
  title: string
  content: string
  published_at?: string
  status: number
}

export async function adminListChangelog(): Promise<ChangelogEntry[]> {
  const env = await req<ChangelogEntry[]>('/admin/changelog')
  return env.data || []
}

export async function createChangelog(payload: ChangelogPayload): Promise<ChangelogEntry> {
  const env = await req<ChangelogEntry>('/admin/changelog', { method: 'POST', body: JSON.stringify(payload) })
  return env.data
}

export async function updateChangelog(id: number, payload: Partial<ChangelogPayload>): Promise<ChangelogEntry> {
  const env = await req<ChangelogEntry>(`/admin/changelog/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  return env.data
}

export async function deleteChangelog(id: number): Promise<void> {
  await req(`/admin/changelog/${id}`, { method: 'DELETE' })
}

// ---------- categories ----------
export async function listCategories(): Promise<Category[]> {
  const env = await req<Array<{ id: number; name: string }>>(`/category/list`)
  return (env.data || []).map((c) => ({ id: String(c.id), name: c.name, count: 0 }))
}
export async function createCategory(name: string) {
  await req(`/category/create`, { method: 'POST', body: JSON.stringify({ name }) })
}
export async function updateCategory(id: string, name: string) {
  await req(`/category/update/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
}
export async function deleteCategory(id: string) {
  await req(`/category/delete/${id}`, { method: 'DELETE' })
}

// ---------- tags ----------
export async function listTags(): Promise<Tag[]> {
  const env = await req<Array<{ id: number; name: string }>>(`/tag/list`)
  return (env.data || []).map((t) => ({ id: String(t.id), name: t.name, count: 0 }))
}
export async function createTag(name: string): Promise<{ id: number; name: string }> {
  const env = await req<{ id: number; name: string }>(`/tag/create`, { method: 'POST', body: JSON.stringify({ name }) })
  return env.data
}
export async function updateTag(id: string, name: string) {
  await req(`/tag/update/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
}
export async function deleteTag(id: string) {
  await req(`/tag/delete/${id}`, { method: 'DELETE' })
}

// ---------- about ----------
export async function getAboutRaw(): Promise<About & { photo_url?: string }> {
  const env = await req<{ title: string; subtitle: string; content: string; photo_url?: string }>(`/about/get`)
  return { ...env.data, photoUrl: env.data.photo_url }
}
export async function updateAbout(p: { title: string; subtitle: string; content: string; photo_url?: string | null }) {
  await req(`/about/update`, { method: 'PUT', body: JSON.stringify(p) })
}
