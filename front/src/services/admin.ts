// Admin API client. Auth is a single static bearer token (BLOG_ADMIN_TOKEN),
// entered on the login page and kept in localStorage — there is no real login
// endpoint on the backend, so we "log in" by verifying the token works.
import type { Category, Tag, About } from './api'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const PREFIX = '/api'
const TOKEN_KEY = 'blog_admin_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}
export function isAuthed(): boolean {
  return !!getToken()
}

export class AuthError extends Error {}

interface Envelope<T> {
  code: number
  message: string
  data: T
  total?: number
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const t = getToken()
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(extra ?? {}) }
}

/** JSON request against an admin endpoint. Throws AuthError on 401. */
async function req<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const res = await fetch(`${API_BASE}${PREFIX}${path}`, {
    ...init,
    headers: authHeaders({ 'Content-Type': 'application/json', ...((init?.headers as Record<string, string>) ?? {}) }),
  })
  if (res.status === 401) {
    clearToken()
    throw new AuthError('未授权，请重新登录')
  }
  const body = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok || (typeof body.code === 'number' && body.code >= 400)) {
    throw new Error(body.message || `请求失败 (${res.status})`)
  }
  return body
}

/** multipart upload (don't set Content-Type — browser adds the boundary). */
async function upload<T>(path: string, file: File, field = 'file'): Promise<Envelope<T>> {
  const fd = new FormData()
  fd.append(field, file)
  const res = await fetch(`${API_BASE}${PREFIX}${path}`, { method: 'POST', headers: authHeaders(), body: fd })
  if (res.status === 401) {
    clearToken()
    throw new AuthError('未授权，请重新登录')
  }
  const body = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok || (typeof body.code === 'number' && body.code >= 400)) {
    throw new Error(body.message || `上传失败 (${res.status})`)
  }
  return body
}

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
  pdf_url?: string | null
  created_at: string
  updated_at?: string
  tags?: Array<{ id: number; name: string }>
}

export interface DashboardStats {
  total_views?: number
  total_posts: number
  total_categories: number
  total_tags: number
  total_music?: number
  recent_posts?: Array<{ id: number; title: string; created_at: string; status: number }>
  system_info?: { uptime?: string; memory_usage?: string; disk_usage?: string }
}

// ---------- auth ----------
/** Verify a token by hitting a protected endpoint. Returns true if accepted. */
export async function verifyToken(token: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}${PREFIX}/admin/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.ok
}

export async function getDashboard(): Promise<DashboardStats> {
  // dashboard/stats returns the object directly (NOT wrapped).
  const res = await fetch(`${API_BASE}${PREFIX}/admin/dashboard/stats`, { headers: authHeaders() })
  if (res.status === 401) {
    clearToken()
    throw new AuthError('未授权')
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
  const env = await req<RawDetail[]>(`/post/list_with_details?page=1&page_size=500`)
  return (env.data || []).map((d) => ({
    ...d.post,
    tags: d.tags ?? d.post.tags,
    category_name: d.category_name ?? d.post.category_name,
  }))
}

export async function adminGetPost(id: number | string): Promise<AdminPost> {
  const env = await req<AdminPost>(`/post/get/${id}`)
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
export async function setPostTags(id: number, tagIds: number[]): Promise<void> {
  await req(`/post/update_tags/${id}`, { method: 'PUT', body: JSON.stringify({ tag_ids: tagIds }) })
}

/** Upload an image, returns its relative URL (/uploads/...). */
export async function uploadImage(file: File): Promise<string> {
  const env = await upload<{ file_url: string }>(`/post/upload_post_image`, file)
  return env.data.file_url
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
