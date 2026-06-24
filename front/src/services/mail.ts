// 邮箱阅读（IMAP）前端服务。
// 凭据（邮箱 + 应用专用密码）由用户在表单里当场填写，每次请求都带上，
// 前端不持久化、不写 localStorage；后端也只临时中转、零存储。
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export interface MailSummary {
  uid: number | null
  from: string
  subject: string
  date: string
  internalDate: string | null
}

export interface MailListResult {
  total: number
  messages: MailSummary[]
}

export interface MailBody {
  subject: string
  from: string
  date: string
  text: string | null
  html: string | null
}

interface Envelope<T> {
  code: number
  message: string
  data: T
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let env: Envelope<T> | null = null
  try {
    env = (await res.json()) as Envelope<T>
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok || !env || env.code !== 0) {
    throw new Error(env?.message || `请求失败 (${res.status})`)
  }
  return env.data
}

export function fetchMailList(email: string, token: string, limit = 20): Promise<MailListResult> {
  return post<MailListResult>('/mail/list', { email, token, limit })
}

export function fetchMailBody(email: string, token: string, uid: number): Promise<MailBody> {
  return post<MailBody>('/mail/body', { email, token, uid })
}
