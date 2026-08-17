// Admin API client. Authentication is carried by a same-origin HttpOnly cookie.
import type { Category, Tag, About } from './api'

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
async function req<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
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

/** multipart upload (don't set Content-Type — browser adds the boundary). */
async function upload<T>(
  path: string,
  file: File,
  field = 'file',
  method: 'POST' | 'PUT' = 'POST',
): Promise<Envelope<T>> {
  const fd = new FormData()
  fd.append(field, file)
  const res = await fetch(`${API_BASE}${PREFIX}${path}`, {
    method,
    credentials: 'include',
    body: fd,
  })
  if (res.status === 401) {
    authExpired('未授权，请重新登录')
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
/** Upload an image, returns its relative URL (/uploads/...). */
export async function uploadImage(file: File): Promise<string> {
  const env = await upload<{ file_url: string }>(`/post/upload_post_image`, file)
  return env.data.file_url
}

/** Replace an existing post cover atomically; the backend removes the old asset. */
export async function replacePostCover(id: number, file: File): Promise<AdminPost> {
  const env = await upload<AdminPost>(`/post/update_cover/${id}`, file, 'file', 'PUT')
  return env.data
}

// ---------- direct R2 video uploads ----------
export interface VideoUploadPart {
  part_number: number
  upload_url: string
}

export interface VideoMultipartSession {
  upload_id: string
  key: string
  public_url: string
  part_size: number
  parts: VideoUploadPart[]
}

export interface CompletedVideoPart {
  part_number: number
  etag: string
}

export async function beginVideoUpload(file: File, contentType: string): Promise<VideoMultipartSession> {
  const env = await req<VideoMultipartSession>('/admin/videos/multipart', {
    method: 'POST',
    body: JSON.stringify({
      file_name: file.name,
      content_type: contentType,
      file_size: file.size,
    }),
  })
  return env.data
}

export async function completeVideoUpload(
  session: VideoMultipartSession,
  parts: CompletedVideoPart[],
): Promise<string> {
  const env = await req<{ public_url: string }>('/admin/videos/multipart/complete', {
    method: 'POST',
    body: JSON.stringify({
      key: session.key,
      upload_id: session.upload_id,
      parts,
    }),
  })
  return env.data.public_url
}

export async function abortVideoUpload(session: VideoMultipartSession): Promise<void> {
  await req('/admin/videos/multipart/abort', {
    method: 'POST',
    body: JSON.stringify({ key: session.key, upload_id: session.upload_id }),
  })
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
