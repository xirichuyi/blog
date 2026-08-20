import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Loader2 } from 'lucide-react'
import { getQuant, type QuantData } from '@/services/quant'

// Read-only performance dashboard with a dedicated terminal-style surface.

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Lightweight SVG equity chart without a charting dependency. */
function EquityChart({ curve, up }: { curve: QuantData['curve']; up: boolean }) {
  const W = 640
  const H = 200
  const pad = { t: 16, r: 8, b: 16, l: 8 }
  if (curve.length < 2) return <div className="h-40 text-sm text-zinc-500">Not enough data to draw the chart.</div>

  const xs = curve.map((_, i) => i)
  const ys = curve.map((p) => p.balance)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanY = maxY - minY || 1
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b

  const px = (i: number) => pad.l + (i / (xs.length - 1)) * innerW
  const py = (v: number) => pad.t + (1 - (v - minY) / spanY) * innerH

  const line = curve.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.balance).toFixed(1)}`).join(' ')
  const area = `${line} L${px(xs.length - 1).toFixed(1)},${(H - pad.b).toFixed(1)} L${px(0).toFixed(1)},${(H - pad.b).toFixed(1)} Z`
  const stroke = up ? '#34d399' : '#f87171'
  const fillId = 'eqfill'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-44 w-full">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500">{sub}</div>}
    </div>
  )
}

export default function Quant() {
  const [data, setData] = useState<QuantData | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  useEffect(() => {
    getQuant()
      .then((d) => {
        if (!d || !d.curve?.length) setState('empty')
        else {
          setData(d)
          setState('ready')
        }
      })
      .catch(() => setState('error'))
  }, [])

  const up = (data?.totalReturnPct ?? 0) >= 0

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
      <Helmet>
        <title>Quant Performance · Barter · chuyi's blog</title>
      </Helmet>

      <Link
        to="/projects"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Projects
      </Link>

      <header className="mb-6">
        <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
          <TrendingUp className="size-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Quant Performance · Barter</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Read-only equity performance for a self-hosted BTC market-making bot. No trades, positions, or strategy details are exposed.
        </p>
      </header>

      {/* Dark terminal-style performance panel. */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-xl">
        {state === 'loading' && (
          <div className="flex items-center gap-2 py-10 text-sm text-zinc-400">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        )}
        {state === 'error' && <p className="py-10 text-sm text-zinc-400">Performance data is temporarily unavailable. Please try again later.</p>}
        {state === 'empty' && <p className="py-10 text-sm text-zinc-400">No performance data yet.</p>}

        {state === 'ready' && data && (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">Total Return</div>
                <div
                  className={`mt-1 text-4xl font-bold tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {up ? '+' : ''}
                  {data.totalReturnPct.toFixed(2)}%
                </div>
              </div>
              <div className="pb-1 text-right">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">Current Equity</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
                  {fmtMoney(data.balance)} <span className="text-sm text-zinc-500">{data.currency}</span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <EquityChart curve={data.curve} up={up} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-zinc-800 pt-5">
              <Stat label="Starting Equity" value={`${fmtMoney(data.baseline)}`} sub={data.startDate} />
              <Stat label="Days Running" value={`${data.days} days`} />
              <Stat label="Data Through" value={data.asOf} sub={`Updated ${fmtDate(data.updated)}`} />
            </div>
          </>
        )}
      </div>

      <div className="mt-12 space-y-2 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground/80">Note.</span>{' '}
          The backend periodically reads daily equity records without modifying the bot or its runtime.
        </p>
        <p>The chart reflects recorded equity history. Past performance does not guarantee future results.</p>
      </div>
    </div>
  )
}
