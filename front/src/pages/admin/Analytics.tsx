import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Eye, RefreshCw, UsersRound } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getAnalytics,
  type AnalyticsBreakdown,
  type AnalyticsDashboard,
  type AnalyticsTrendPoint,
} from '@/services/admin'

type Range = 7 | 30 | 90

const number = new Intl.NumberFormat('zh-CN')
const shortDate = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' })
const fullDate = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const regionNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['zh-CN'], { type: 'region' })
  : null

function countryName(item: AnalyticsBreakdown): string {
  if (!item.key) return '未知地区'
  try {
    return regionNames?.of(item.key.toUpperCase()) || item.label
  } catch {
    return item.label
  }
}

function TrendChart({ points }: { points: AnalyticsTrendPoint[] }) {
  const chart = useMemo(() => {
    const width = 720
    const height = 216
    const baseline = 188
    const ceiling = 18
    const maximum = Math.max(...points.map((point) => point.pageviews), 1)
    const coordinates = points.map((point, index) => {
      const x = points.length <= 1 ? width / 2 : (index / (points.length - 1)) * width
      const y = baseline - (point.pageviews / maximum) * (baseline - ceiling)
      return { x, y, point }
    })
    const line = coordinates.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ')
    const area = coordinates.length
      ? `${line} L ${coordinates.at(-1)?.x ?? width} ${baseline} L ${coordinates[0].x} ${baseline} Z`
      : ''
    return { width, height, baseline, maximum, coordinates, line, area }
  }, [points])

  if (!points.length) return <div className="admin-analytics-empty">这段时间还没有访问记录。</div>

  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])
  return (
    <div className="admin-trend-chart">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="每日浏览趋势">
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chart.baseline - ratio * (chart.baseline - 18)
          return <line key={ratio} x1="0" x2={chart.width} y1={y} y2={y} className="admin-chart-grid" />
        })}
        <path d={chart.area} className="admin-chart-area" />
        <path d={chart.line} className="admin-chart-line" />
        {chart.coordinates.map(({ x, y, point }, index) => (
          <g key={point.date}>
            <circle cx={x} cy={y} r="8" className="admin-chart-hit">
              <title>{`${point.date} · ${number.format(point.pageviews)} 次浏览 · ${number.format(point.visits)} 次访问`}</title>
            </circle>
            <circle cx={x} cy={y} r="2.2" className="admin-chart-dot" />
            {labelIndexes.has(index) && (
              <text x={x} y="211" textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>
                {shortDate.format(new Date(`${point.date}T00:00:00`))}
              </text>
            )}
          </g>
        ))}
      </svg>
      <span className="admin-chart-peak">峰值 {number.format(chart.maximum)}</span>
    </div>
  )
}

function Ranking({
  items,
  label,
  resolveLabel = (item) => item.label,
}: {
  items: AnalyticsBreakdown[]
  label: string
  resolveLabel?: (item: AnalyticsBreakdown) => string
}) {
  const maximum = Math.max(...items.map((item) => item.pageviews), 1)
  return (
    <section className="admin-analytics-ranking">
      <h3>{label}</h3>
      {items.length ? (
        <ol>
          {items.map((item) => (
            <li key={item.key || item.label}>
              <div className="admin-ranking-copy">
                <span title={resolveLabel(item)}>{resolveLabel(item)}</span>
                <strong>{number.format(item.pageviews)}</strong>
              </div>
              <div className="admin-ranking-track" aria-hidden="true">
                <i style={{ width: `${Math.max((item.pageviews / maximum) * 100, 2)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="admin-analytics-muted">暂无数据</p>
      )}
    </section>
  )
}

export default function Analytics() {
  const [days, setDays] = useState<Range>(30)
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getAnalytics(days)
      .then((result) => active && setData(result))
      .catch((reason: Error) => active && setError(reason.message || '统计加载失败'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [days, reloadKey])

  const average = data?.visits ? data.pageviews / data.visits : 0

  return (
    <div className="admin-analytics">
      <div className="admin-analytics-controls" aria-label="统计时间范围">
        <div className="admin-range-tabs">
          {([7, 30, 90] as const).map((range) => (
            <button
              key={range}
              type="button"
              className={days === range ? 'is-active' : ''}
              onClick={() => setDays(range)}
            >
              {range} 天
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} /> 刷新
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>访问统计加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data && (
        <div className="space-y-5">
          <Skeleton className="h-20 rounded-sm" />
          <Skeleton className="h-72 rounded-sm" />
          <Skeleton className="h-64 rounded-sm" />
        </div>
      )}

      {data && !data.available && !loading && (
        <div className="admin-analytics-empty-state">
          <Eye />
          <h2>统计还没有接通</h2>
          <p>{data.message || 'Cloudflare Web Analytics 暂时不可用。'}</p>
        </div>
      )}

      {data?.available && (
        <>
          <section className="admin-analytics-summary">
            <div>
              <Eye />
              <strong>{number.format(data.pageviews)}</strong>
              <span>页面浏览</span>
            </div>
            <div>
              <UsersRound />
              <strong>{number.format(data.visits)}</strong>
              <span>独立访问</span>
            </div>
            <div>
              <span className="admin-summary-mark">≈</span>
              <strong>{average.toFixed(1)}</strong>
              <span>页 / 次访问</span>
            </div>
          </section>

          <section className="admin-analytics-trend">
            <div className="admin-analytics-heading">
              <div>
                <p>访问流动</p>
                <h2>每日浏览趋势</h2>
              </div>
              <span>{data.from} — {data.to}</span>
            </div>
            <TrendChart points={data.trend} />
          </section>

          {data.message && <p className="admin-analytics-notice">{data.message}</p>}

          <div className="admin-analytics-detail-grid">
            <section className="admin-top-pages">
              <h3>常被读到</h3>
              {data.top_pages.length ? (
                <ol>
                  {data.top_pages.map((page, index) => (
                    <li key={page.path}>
                      <span className="admin-page-rank">{String(index + 1).padStart(2, '0')}</span>
                      <span className="admin-page-copy">
                        <strong>{page.title}</strong>
                        <small>{page.path}</small>
                      </span>
                      <span className="admin-page-count">{number.format(page.pageviews)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="admin-analytics-muted">暂无页面数据</p>
              )}
            </section>
            <Ranking items={data.referrers} label="从何处来" />
          </div>

          <div className="admin-analytics-breakdowns">
            <Ranking items={data.devices} label="使用设备" />
            <Ranking items={data.countries} label="访客地区" resolveLabel={countryName} />
          </div>

          <footer className="admin-analytics-footer">
            <span>数据来自 {data.provider}，已排除已识别的机器人流量</span>
            <span>更新于 {fullDate.format(new Date(data.updated_at))}{data.cached ? ' · 缓存' : ''}</span>
          </footer>
        </>
      )}
    </div>
  )
}
