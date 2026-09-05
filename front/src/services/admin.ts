// Admin API client. Authentication is carried by a same-origin HttpOnly cookie.
import type { Category, Tag, About, Book, ChangelogEntry, ReadingStatus } from './api'
import { ApiError, apiRequest, type ApiPage } from './http'

export const ADMIN_AUTH_EXPIRED_EVENT = 'blog-admin-auth-expired'

export class AuthError extends Error {}

function authExpired(message: string): never {
  window.dispatchEvent(new Event(ADMIN_AUTH_EXPIRED_EVENT))
  throw new AuthError(message)
}

/** JSON request against an admin endpoint. Throws AuthError on 401. */
export async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...init, credentials: 'include' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      authExpired('未授权，请重新登录')
    }
    throw error
  }
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

export interface AnalyticsTrendPoint {
  date: string
  pageviews: number
  visits: number
}

export interface AnalyticsPage {
  path: string
  title: string
  pageviews: number
  visits: number
}

export interface AnalyticsBreakdown {
  key: string
  label: string
  pageviews: number
}

export interface AnalyticsDashboard {
  available: boolean
  provider: string
  days: 7 | 30 | 90
  from: string
  to: string
  pageviews: number
  visits: number
  trend: AnalyticsTrendPoint[]
  top_pages: AnalyticsPage[]
  referrers: AnalyticsBreakdown[]
  devices: AnalyticsBreakdown[]
  countries: AnalyticsBreakdown[]
  updated_at: string
  cached: boolean
  message?: string | null
}

// ---------- auth ----------
export interface AdminSession {
  email: string
  name: string
  picture?: string | null
}

export function googleLoginUrl(): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  return `${base}/api/auth/google/start`
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    return await apiRequest<AdminSession>('/auth/session', { credentials: 'include' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function logoutAdmin(): Promise<void> {
  await apiRequest<void>('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}

export async function getDashboard(): Promise<DashboardStats> {
  return adminRequest<DashboardStats>('/admin/dashboard/stats')
}

export async function getAnalytics(days: 7 | 30 | 90): Promise<AnalyticsDashboard> {
  return req<AnalyticsDashboard>(`/admin/analytics?days=${days}`)
}

// ---------- posts ----------
/** List ALL posts (incl. drafts) — omit status. */
export async function adminListPosts(): Promise<AdminPost[]> {
  const page = await req<ApiPage<AdminPost>>(`/admin/posts?page=1&page_size=500`)
  return page.items
}

export async function adminGetPost(id: number | string): Promise<AdminPost> {
  return req<AdminPost>(`/admin/posts/${id}`)
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
  return req<AdminPost>('/admin/posts', { method: 'POST', body: JSON.stringify(p) })
}
export async function updatePost(id: number, p: Partial<PostPayload>): Promise<AdminPost> {
  return req<AdminPost>(`/admin/posts/${id}`, { method: 'PUT', body: JSON.stringify(p) })
}
export async function deletePost(id: number): Promise<void> {
  await req(`/admin/posts/${id}`, { method: 'DELETE' })
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
  return req<Book[]>('/admin/books')
}

export async function createBook(payload: BookPayload): Promise<Book> {
  return req<Book>('/admin/books', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateBook(id: number, payload: Partial<BookPayload>): Promise<Book> {
  return req<Book>(`/admin/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
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
  return req<ChangelogEntry[]>('/admin/changelog')
}

export async function createChangelog(payload: ChangelogPayload): Promise<ChangelogEntry> {
  return req<ChangelogEntry>('/admin/changelog', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateChangelog(id: number, payload: Partial<ChangelogPayload>): Promise<ChangelogEntry> {
  return req<ChangelogEntry>(`/admin/changelog/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteChangelog(id: number): Promise<void> {
  await req(`/admin/changelog/${id}`, { method: 'DELETE' })
}

// ---------- categories ----------
export async function listCategories(): Promise<Category[]> {
  const categories = await req<Array<{ id: number; name: string }>>('/categories')
  return categories.map((category) => ({ id: String(category.id), name: category.name, count: 0 }))
}
export async function createCategory(name: string) {
  await req('/admin/categories', { method: 'POST', body: JSON.stringify({ name }) })
}
export async function updateCategory(id: string, name: string) {
  await req(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
}
export async function deleteCategory(id: string) {
  await req(`/admin/categories/${id}`, { method: 'DELETE' })
}

// ---------- tags ----------
export async function listTags(): Promise<Tag[]> {
  const tags = await req<Array<{ id: number; name: string }>>('/tags')
  return tags.map((tag) => ({ id: String(tag.id), name: tag.name, count: 0 }))
}
export async function createTag(name: string): Promise<{ id: number; name: string }> {
  return req<{ id: number; name: string }>('/admin/tags', { method: 'POST', body: JSON.stringify({ name }) })
}
export async function updateTag(id: string, name: string) {
  await req(`/admin/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
}
export async function deleteTag(id: string) {
  await req(`/admin/tags/${id}`, { method: 'DELETE' })
}

// ---------- about ----------
export async function getAboutRaw(): Promise<About & { photo_url?: string }> {
  const about = await req<{ title: string; subtitle: string; content: string; photo_url?: string }>('/about')
  return { ...about, photoUrl: about.photo_url }
}
export async function updateAbout(p: { title: string; subtitle: string; content: string; photo_url?: string | null }) {
  await req('/admin/about', { method: 'PUT', body: JSON.stringify(p) })
}
