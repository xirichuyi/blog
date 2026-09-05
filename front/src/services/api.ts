// Typed API client for the Rust/Axum blog backend.
// In prod the SPA is same-origin behind nginx; media assets are public R2 URLs.
import { apiRequest, apiUrl, assetUrl, type ApiPage } from './http'

export interface Article {
  id: string
  title: string
  excerpt: string
  content: string
  date: string
  rawDate: string
  updatedAt?: string
  category: string
  tags: string[]
  coverImage?: string
}
export interface AdjacentArticle {
  id: string
  title: string
}
export interface AdjacentArticles {
  newer?: AdjacentArticle
  older?: AdjacentArticle
}
export interface Category {
  id: string
  name: string
  count: number
}
export interface Tag {
  id: string
  name: string
  count: number
}
export interface About {
  title: string
  subtitle: string
  content: string
  photoUrl?: string
}
export interface HealthStatus {
  status: string
  uptime_seconds?: number
  founded_at?: string
  checks?: {
    memory?: { details?: { usage_percent?: number; memory_usage_mb?: number; total_memory_mb?: number } }
    disk?: { details?: { usage_percent?: number } }
  }
}

export type ReadingStatus = 'want_to_read' | 'reading' | 'finished' | 'paused'

export interface BookFile {
  id: number
  book_id: number
  format: string
  file_url: string
  r2_key: string
  file_name: string
  file_size: number
  mime_type: string
  created_at: string
}

export interface Book {
  id: number
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
  created_at: string
  updated_at: string
  files: BookFile[]
}

export interface ChangelogEntry {
  id: number
  version: string
  title: string
  content: string
  published_at: string
  status: number
  created_at: string
  updated_at: string
}

interface RawPost {
  id: number
  title: string
  content?: string
  excerpt?: string
  cover_url?: string
  category_name?: string
  category_id?: number
  status: number
  created_at: string
  updated_at?: string
  // tags live inside `post` and may be objects or plain strings
  tags?: Array<{ id?: number; name: string } | string>
}
interface RawTag {
  id: number
  name: string
}
function tagNames(tags?: RawPost['tags']): string[] {
  return (tags ?? []).map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean) as string[]
}

export function imageUrl(p?: string): string | undefined {
  return assetUrl(p)
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Strip Markdown to a plain-text excerpt. */
export function stripMarkdown(md: string, maxLength = 140): string {
  if (!md) return ''
  const text = md
    .replace(/^:::[^\n]*$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/<[^>]*>/g, '')
    .replace(/https?:\/\/\S+/g, '') // strip bare URLs — they read terribly as a subtitle
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '…' : text
}

/** Clean a stored excerpt for display (drop bare URLs); '' if nothing meaningful remains. */
function cleanExcerpt(s?: string): string {
  return (s ?? '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
}

function toArticle(post: RawPost): Article {
  const content = post.content || ''
  return {
    id: String(post.id),
    title: post.title,
    content,
    excerpt: cleanExcerpt(post.excerpt) || stripMarkdown(content, 140),
    date: formatDate(post.created_at),
    rawDate: post.created_at,
    updatedAt: post.updated_at,
    category: post.category_name || 'Uncategorized',
    tags: tagNames(post.tags),
    coverImage: imageUrl(post.cover_url),
  }
}

export async function listArticles(params: {
  page?: number
  pageSize?: number
  category?: string
  tagId?: string
} = {}): Promise<{ articles: Article[]; total: number }> {
  const q = new URLSearchParams({ status: 'Published' })
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('page_size', String(params.pageSize))
  if (params.category) q.set('category', params.category)
  if (params.tagId) q.set('tag_id', params.tagId)
  const page = await apiRequest<ApiPage<RawPost>>(`/posts?${q.toString()}`)
  const items = page.items
  return {
    articles: items.map(toArticle),
    total: page.total,
  }
}

export async function getArticle(id: string, signal?: AbortSignal): Promise<Article> {
  const post = await apiRequest<RawPost>(`/posts/${id}`, { signal })
  const article = toArticle(post)
  // If the post payload didn't include tags, fetch them separately.
  if (article.tags.length === 0) {
    try {
      const tags = await apiRequest<RawTag[]>(`/posts/${id}/tags`, { signal })
      article.tags = tags.map((tag) => tag.name)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      /* tags optional */
    }
  }
  return article
}

export async function getAdjacentArticles(id: string, signal?: AbortSignal): Promise<AdjacentArticles> {
  const adjacent = await apiRequest<{
    newer?: { id: number; title: string } | null
    older?: { id: number; title: string } | null
  }>(`/posts/${id}/adjacent`, { signal })
  return {
    newer: adjacent.newer ? { ...adjacent.newer, id: String(adjacent.newer.id) } : undefined,
    older: adjacent.older ? { ...adjacent.older, id: String(adjacent.older.id) } : undefined,
  }
}

export async function getCategories(): Promise<Category[]> {
  const categories = await apiRequest<Array<{ id: number; name: string }>>('/categories')
  return categories.map((category) => ({ id: String(category.id), name: category.name, count: 0 }))
}

export async function getTags(): Promise<Tag[]> {
  const tags = await apiRequest<RawTag[]>('/tags')
  return tags.map((tag) => ({ id: String(tag.id), name: tag.name, count: 0 }))
}

export async function getAbout(): Promise<About> {
  const about = await apiRequest<{ title: string; subtitle: string; content: string; photo_url?: string }>('/about')
  return {
    title: about.title,
    subtitle: about.subtitle,
    content: about.content,
    photoUrl: imageUrl(about.photo_url),
  }
}

/** Convert an online GitBook/bookdown book to EPUB. Returns the file blob. */
export async function gitbook2epub(
  url: string,
  includeImages = false,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(apiUrl('/tools/gitbook2epub'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, include_images: includeImages }),
  })
  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      /* non-JSON error */
    }
    throw new Error(message)
  }
  const blob = await res.blob()
  // Prefer the server-provided filename, fall back to a sane default.
  const cd = res.headers.get('Content-Disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(cd)
  return { blob, filename: match?.[1] || 'book.epub' }
}

export async function getHealth(): Promise<HealthStatus> {
  return apiRequest<HealthStatus>('/health')
}

export async function listBooks(): Promise<Book[]> {
  return apiRequest<Book[]>('/books')
}

export function bookFileContentUrl(file: BookFile): string {
  return imageUrl(file.file_url) ?? file.file_url
}

export async function listChangelog(): Promise<ChangelogEntry[]> {
  return apiRequest<ChangelogEntry[]>('/changelog')
}
