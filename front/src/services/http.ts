const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T | null
}

export interface ApiPage<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function apiUrl(path: string): string {
  return `${API_BASE}/api${path}`
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(path), { ...init, headers })
  const envelope = await readEnvelope<T>(response)
  if (envelope.code !== response.status) {
    throw new ApiError('服务器响应状态不一致', response.status, envelope.code)
  }
  if (!response.ok || envelope.code >= 400) {
    throw new ApiError(
      envelope.message || `请求失败 (${response.status})`,
      response.status,
      envelope.code,
    )
  }
  return envelope.data as T
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    const envelope = (await response.json()) as Partial<ApiEnvelope<T>>
    if (typeof envelope.code !== 'number' || typeof envelope.message !== 'string' || !('data' in envelope)) {
      throw new Error('Invalid API envelope')
    }
    return envelope as ApiEnvelope<T>
  } catch {
    throw new ApiError(`服务器返回了无效响应 (${response.status})`, response.status, response.status)
  }
}

export function assetUrl(path?: string): string | undefined {
  if (!path) return undefined
  return path.startsWith('http') ? path : `${API_BASE}${path}`
}
