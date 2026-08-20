// Read-only performance data relayed from the Barter bot records.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export interface QuantPoint {
  date: string
  balance: number
}

export interface QuantData {
  updated: string // Extraction timestamp (ISO)
  asOf: string // Last daily_balance date (YYYY-MM-DD)
  currency: string // USDT
  baseline: number // Starting equity
  balance: number // Latest equity
  totalReturnPct: number // Total return percentage
  startDate: string // Starting date
  days: number // Days running
  curve: QuantPoint[] // Equity curve
}

export async function getQuant(): Promise<QuantData | null> {
  const res = await fetch(`${API_BASE}/api/quant`)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const env = (await res.json()) as { code: number; data: QuantData | null }
  return env.data
}
