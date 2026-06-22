import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { Article } from '@/services/api'

const ACCENT = '#22c55e'

/** Build last-12-months post-count buckets from articles. */
export function monthlyActivity(articles: Article[]): { label: string; count: number }[] {
  const now = new Date()
  const buckets: { key: string; label: string; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      count: 0,
    })
  }
  for (const a of articles) {
    if (!a.rawDate) continue
    const d = new Date(a.rawDate)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const b = buckets.find((x) => x.key === key)
    if (b) b.count++
  }
  return buckets.map(({ label, count }) => ({ label, count }))
}

export function ActivityChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,140,0.15)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          cursor={{ stroke: 'rgba(128,128,140,0.3)' }}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
            color: 'hsl(var(--popover-foreground))',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          formatter={(v: number) => [`${v} posts`, 'Posts']}
        />
        <Area type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} fill="url(#activityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
