import { apiRequest } from './http'

// IMAP credentials are sent per request and are never persisted by the client.
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

function post<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchMailList(email: string, token: string, limit = 20): Promise<MailListResult> {
  return post<MailListResult>('/mail/list', { email, token, limit })
}

export function fetchMailBody(email: string, token: string, uid: number): Promise<MailBody> {
  return post<MailBody>('/mail/body', { email, token, uid })
}
