import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Loader2 } from 'lucide-react'
import { getQuant, type QuantData } from '@/services/quant'

// 量化收益仪表盘：独立的「交易终端」风格(始终深色),和博客其他极简页面区分开。
// 只展示收益:总收益率 + 权益曲线 + 几个汇总数字,不涉及交易/仓位/策略。

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
}

/** 手搓 SVG 权益曲线（面积 + 折线），无第三方图表库。 */
function EquityChart({ curve, up }: { curve: QuantData['curve']; up: boolean }) {
  const W = 640
  const H = 200
  const pad = { t: 16, r: 8, b: 16, l: 8 }
  if (curve.length < 2) return <div className="h-40 text-sm text-zinc-500">数据点不足，无法绘制曲线。</div>

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
        <title>量化收益 · Barter · chuyi's blog</title>
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
        <h1 className="text-2xl font-bold tracking-tight">量化收益 · Barter</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          自建 BTC 做市机器人的权益走势。只读展示，仅收益数据，不含交易、仓位或策略。
        </p>
      </header>

      {/* 深色交易终端面板 */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-xl">
        {state === 'loading' && (
          <div className="flex items-center gap-2 py-10 text-sm text-zinc-400">
            <Loader2 className="size-4 animate-spin" /> 加载中…
          </div>
        )}
        {state === 'error' && <p className="py-10 text-sm text-zinc-400">暂时无法加载收益数据，稍后再试。</p>}
        {state === 'empty' && <p className="py-10 text-sm text-zinc-400">暂无收益数据。</p>}

        {state === 'ready' && data && (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">总收益率</div>
                <div
                  className={`mt-1 text-4xl font-bold tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {up ? '+' : ''}
                  {data.totalReturnPct.toFixed(2)}%
                </div>
              </div>
              <div className="pb-1 text-right">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">当前权益</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
                  {fmtMoney(data.balance)} <span className="text-sm text-zinc-500">{data.currency}</span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <EquityChart curve={data.curve} up={up} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-zinc-800 pt-5">
              <Stat label="起始权益" value={`${fmtMoney(data.baseline)}`} sub={data.startDate} />
              <Stat label="运行天数" value={`${data.days} 天`} />
              <Stat label="数据截至" value={data.asOf} sub={`更新于 ${fmtDate(data.updated)}`} />
            </div>
          </>
        )}
      </div>

      <div className="mt-12 space-y-2 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground/80">说明.</span>{' '}
          数据由后端定时以只读方式从机器人记录的每日权益中提取，机器人本身代码与运行不受影响。
        </p>
        <p>权益快照随机器人记录更新；曲线反映已记录区间的净值走势，过往表现不代表未来收益。</p>
      </div>
    </div>
  )
}
