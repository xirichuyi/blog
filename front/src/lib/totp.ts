// Time-based one-time passwords (RFC 6238), computed entirely in the browser.
// Nothing in this module talks to the network.

export type OtpAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

export interface OtpAccount {
  /** Raw shared secret. */
  secret: Uint8Array
  /** "issuer: account", or '' when the source carried no name. */
  label: string
  algorithm: OtpAlgorithm
  digits: number
  /** Seconds each code stays valid. */
  period: number
}

export class OtpParseError extends Error {}

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Decode an RFC 4648 base32 secret. Spaces, dashes, padding and case are ignored. */
export function decodeBase32(input: string): Uint8Array {
  const text = input.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase()
  if (!text) throw new OtpParseError('密钥为空')
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of text) {
    const value = BASE32.indexOf(char)
    if (value < 0) throw new OtpParseError('密钥不是有效的 Base32（只能包含 A–Z 和 2–7）')
    buffer = (buffer << 5) | value
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  if (bytes.length === 0) throw new OtpParseError('密钥太短')
  return new Uint8Array(bytes)
}

function algorithmFromName(name: string | null): OtpAlgorithm {
  switch ((name ?? 'SHA1').toUpperCase().replace('-', '')) {
    case 'SHA1': return 'SHA-1'
    case 'SHA256': return 'SHA-256'
    case 'SHA512': return 'SHA-512'
    default: throw new OtpParseError(`不支持的算法：${name}`)
  }
}

function boundedInt(value: string | null, fallback: number, min: number, max: number, name: string): number {
  if (value === null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new OtpParseError(`${name}无效：${value}`)
  return parsed
}

function joinLabel(issuer: string, name: string): string {
  const account = name.trim()
  const from = issuer.trim()
  if (!from) return account
  if (!account) return from
  return account.toLowerCase().startsWith(`${from.toLowerCase()}:`) ? account : `${from}: ${account}`
}

function parseOtpauth(uri: string): OtpAccount {
  let url: URL
  try { url = new URL(uri) } catch { throw new OtpParseError('otpauth 链接格式不正确') }
  // Browsers disagree on where a non-special scheme puts "totp", so read it from the text.
  const type = /^otpauth:\/\/([^/?#]+)/i.exec(uri)?.[1]?.toLowerCase()
  if (type === 'hotp') throw new OtpParseError('这是计数器型（HOTP）密钥，这里只支持基于时间的 TOTP')
  if (type !== 'totp') throw new OtpParseError('otpauth 链接格式不正确')
  const secret = url.searchParams.get('secret')
  if (!secret) throw new OtpParseError('otpauth 链接里没有 secret 参数')
  const path = /^otpauth:\/\/[^/?#]+\/([^?#]*)/i.exec(uri)?.[1] ?? ''
  let name = path
  try { name = decodeURIComponent(path) } catch { /* Keep the raw label. */ }
  return {
    secret: decodeBase32(secret),
    label: joinLabel(url.searchParams.get('issuer') ?? '', name),
    algorithm: algorithmFromName(url.searchParams.get('algorithm')),
    digits: boundedInt(url.searchParams.get('digits'), 6, 6, 8, '验证码位数'),
    period: boundedInt(url.searchParams.get('period'), 30, 5, 600, '刷新周期'),
  }
}

// --- Google Authenticator export (otpauth-migration://offline?data=…) ---
// The payload is a protobuf: MigrationPayload{ repeated OtpParameters = 1 },
// OtpParameters{ secret=1, name=2, issuer=3, algorithm=4, digits=5, type=6 }.

interface ProtoField { number: number; wire: number; varint: number; bytes: Uint8Array }

function readProto(data: Uint8Array): ProtoField[] {
  const fields: ProtoField[] = []
  let offset = 0
  const varint = () => {
    let value = 0
    let scale = 1
    for (;;) {
      if (offset >= data.length) throw new OtpParseError('导出数据已损坏')
      const byte = data[offset++]
      value += (byte & 0x7f) * scale
      scale *= 128
      if (byte < 0x80) return value
    }
  }
  while (offset < data.length) {
    const key = varint()
    const field: ProtoField = { number: Math.floor(key / 8), wire: key % 8, varint: 0, bytes: new Uint8Array() }
    if (field.wire === 0) field.varint = varint()
    else if (field.wire === 2) {
      const length = varint()
      if (offset + length > data.length) throw new OtpParseError('导出数据已损坏')
      field.bytes = data.subarray(offset, offset + length)
      offset += length
    } else if (field.wire === 1) offset += 8
    else if (field.wire === 5) offset += 4
    else throw new OtpParseError('导出数据已损坏')
    fields.push(field)
  }
  return fields
}

function parseMigration(uri: string): OtpAccount[] {
  const data = /[?&]data=([^&#]+)/.exec(uri)?.[1]
  if (!data) throw new OtpParseError('导出链接里没有 data 参数')
  let payload: Uint8Array
  try {
    const base64 = decodeURIComponent(data).replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '+')
    payload = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  } catch {
    throw new OtpParseError('导出数据已损坏')
  }
  const text = new TextDecoder()
  const accounts: OtpAccount[] = []
  let skipped = 0
  for (const entry of readProto(payload)) {
    if (entry.number !== 1 || entry.wire !== 2) continue
    let secret = new Uint8Array()
    let name = ''
    let issuer = ''
    let algorithm = 1
    let digits = 1
    let type = 2
    for (const field of readProto(entry.bytes)) {
      if (field.number === 1) secret = new Uint8Array(field.bytes)
      else if (field.number === 2) name = text.decode(field.bytes)
      else if (field.number === 3) issuer = text.decode(field.bytes)
      else if (field.number === 4) algorithm = field.varint
      else if (field.number === 5) digits = field.varint
      else if (field.number === 6) type = field.varint
    }
    const hash: OtpAlgorithm | null =
      algorithm <= 1 ? 'SHA-1' : algorithm === 2 ? 'SHA-256' : algorithm === 3 ? 'SHA-512' : null
    // type 1 is HOTP; anything that is not time-based cannot be shown as a rolling code.
    if (secret.length === 0 || type === 1 || !hash) { skipped += 1; continue }
    accounts.push({ secret, label: joinLabel(issuer, name), algorithm: hash, digits: digits === 2 ? 8 : 6, period: 30 })
  }
  if (accounts.length === 0) {
    throw new OtpParseError(skipped > 0 ? '导出内容里没有可用的 TOTP 账号' : '导出内容为空')
  }
  return accounts
}

/**
 * Read accounts from whatever the user supplied: a base32 secret, an
 * otpauth://totp/… link, or a Google Authenticator export link. Several
 * entries may be given on separate lines.
 */
export function parseOtpInput(input: string): OtpAccount[] {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) throw new OtpParseError('请输入密钥或 otpauth 链接')
  return lines.flatMap((line): OtpAccount[] => {
    if (/^otpauth-migration:\/\//i.test(line)) return parseMigration(line)
    if (/^otpauth:\/\//i.test(line)) return [parseOtpauth(line)]
    return [{ secret: decodeBase32(line), label: '', algorithm: 'SHA-1', digits: 6, period: 30 }]
  })
}

/** The code valid at `timeMs`. */
export async function totp(account: OtpAccount, timeMs: number): Promise<string> {
  const counter = Math.floor(timeMs / 1000 / account.period)
  const message = new Uint8Array(8)
  const view = new DataView(message.buffer)
  view.setUint32(0, Math.floor(counter / 2 ** 32))
  view.setUint32(4, counter >>> 0)
  const key = await crypto.subtle.importKey(
    'raw', account.secret as BufferSource, { name: 'HMAC', hash: account.algorithm }, false, ['sign'],
  )
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, message))
  const offset = mac[mac.length - 1] & 0x0f
  const binary =
    ((mac[offset] & 0x7f) * 2 ** 24) + (mac[offset + 1] << 16) + (mac[offset + 2] << 8) + mac[offset + 3]
  return String(binary % 10 ** account.digits).padStart(account.digits, '0')
}

/** Seconds until the code valid at `timeMs` is replaced. */
export function secondsRemaining(account: OtpAccount, timeMs: number): number {
  const seconds = Math.floor(timeMs / 1000)
  return account.period - (seconds % account.period)
}
