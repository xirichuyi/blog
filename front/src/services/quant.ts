// 量化机器人收益数据(只读展示)。数据由后端从 Vector 上的 Barter 机器人
// trades.db 只读提取,服务端不参与交易、只转发收益快照。
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export interface QuantPoint {
  date: string
  balance: number
}

export interface QuantData {
  updated: string // 提取时刻 (ISO)
  asOf: string // daily_balance 最后一天 (YYYY-MM-DD)
  currency: string // USDT
  baseline: number // 起始权益
  balance: number // 最新权益
  totalReturnPct: number // 总收益率 %
  startDate: string // 起始日期
  days: number // 运行天数
  curve: QuantPoint[] // 权益曲线
}

export async function getQuant(): Promise<QuantData | null> {
  const res = await fetch(`${API_BASE}/api/quant`)
  if (!res.ok) throw new Error(`请求失败 (${res.status})`)
  const env = (await res.json()) as { code: number; data: QuantData | null }
  return env.data
}
