// IMAP credentials are sent per request and are never persisted by the client.
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
    throw new Error(env?.message || `Request failed (${res.status})`)
  }
  return env.data
}

export function fetchMailList(email: string, token: string, limit = 20): Promise<MailListResult> {
  return post<MailListResult>('/mail/list', { email, token, limit })
}

export function fetchMailBody(email: string, token: string, uid: number): Promise<MailBody> {
  return post<MailBody>('/mail/body', { email, token, uid })
}
