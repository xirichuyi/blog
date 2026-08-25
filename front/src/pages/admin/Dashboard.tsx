import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, PenLine } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboard, STATUS_NAME, type DashboardStats } from '@/services/admin'

const STATUS_LABEL: Record<number, string> = {
  0: '草稿',
  1: '已发布',
  2: '已删除',
  3: '私密',
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  )
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    getDashboard().then(setStats).catch((error) => setErr(String(error.message || error)))
  }, [])

  return (
    <div className="admin-dashboard">
      <section className="admin-writing-prompt">
        <div>
          <p className="kicker">书房札记</p>
          <h2>今天，想留下一些什么？</h2>
          <p>把念头慢慢写下来，也把寻常日子妥帖收好。</p>
        </div>
        <Button asChild className="admin-writing-action shrink-0">
          <Link to="/admin/posts/new"><PenLine /> 写一篇</Link>
        </Button>
      </section>

      {err && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>概览加载失败</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {!stats && !err && (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      )}

      {stats && (
        <>
          <section className="admin-stat-line">
            <Stat label="全部文章" value={stats.total_posts} />
            <Stat label="内容分类" value={stats.total_categories} />
            <Stat label="常用标签" value={stats.total_tags} />
          </section>

          <div className="admin-dashboard-grid">
            <section>
              <div className="admin-section-heading">
                <div>
                  <h3>近来写下</h3>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  <Link to="/admin/posts">全部文章 <ArrowRight className="size-3.5" /></Link>
                </Button>
              </div>
              <div>
                {stats.recent_posts?.map((post) => (
                  <Link
                    key={post.id}
                    to={`/admin/posts/${post.id}`}
                    className="admin-article-row"
                  >
                    <span className="min-w-0 flex-1">
                      <strong>{post.title || '(无标题)'}</strong>
                      <span className="admin-article-meta">{shortDate(post.created_at)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {STATUS_LABEL[post.status] ?? STATUS_NAME[post.status] ?? post.status}
                    </span>
                  </Link>
                ))}
                {!stats.recent_posts?.length && (
                  <div className="admin-empty-note">还没有文章，从第一篇开始吧。</div>
                )}
              </div>
            </section>

            <aside className="admin-side-notes">
              {stats.system_info && (
                <section className="admin-side-note">
                  <div className="admin-site-state">此间安好</div>
                  <p className="admin-site-age">已生长 {stats.system_info.uptime}</p>
                  <p className="admin-site-since">始于 2025 年 5 月 2 日</p>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
