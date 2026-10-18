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

// Outlook personal accounts can no longer log in with a password (Microsoft
// disabled basic auth), so sellers hand out a combo string that also carries an
// OAuth2 refresh_token + client_id. We pass those through to the backend, which
// exchanges them for an access token and logs in via XOAUTH2.
export interface MailCreds {
  email: string
  token: string
  refreshToken?: string
  clientId?: string
}

function post<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function payload(c: MailCreds, extra: Record<string, unknown>) {
  return {
    email: c.email,
    token: c.token,
    refresh_token: c.refreshToken,
    client_id: c.clientId,
    ...extra,
  }
}

export function fetchMailList(creds: MailCreds, limit = 20): Promise<MailListResult> {
  return post<MailListResult>('/mail/list', payload(creds, { limit }))
}

export function fetchMailBody(creds: MailCreds, uid: number): Promise<MailBody> {
  return post<MailBody>('/mail/body', payload(creds, { uid }))
}

// Parse a seller-supplied Outlook combo like
// `email----password----refresh_token----client_id` (also tolerates `|`, tab,
// or whitespace separators). Returns null when the input isn't a 4-field combo.
export function parseCombo(raw: string): MailCreds | null {
  const s = raw.trim()
  if (!s) return null
  const parts = s.includes('----')
    ? s.split('----')
    : s.split(/[|\t\s]+/)
  const cleaned = parts.map((p) => p.trim()).filter(Boolean)
  if (cleaned.length < 4) return null
  const [email, token, refreshToken, clientId] = cleaned
  if (!email.includes('@')) return null
  return { email, token, refreshToken, clientId }
}
