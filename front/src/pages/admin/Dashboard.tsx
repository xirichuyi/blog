import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, FileText, FolderTree, Tags, Plus } from 'lucide-react'
import { getDashboard, STATUS_NAME, type DashboardStats } from '@/services/admin'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent><div className="text-2xl font-semibold">{value}</div></CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch((e) => setErr(String(e.message || e)))
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">概览</h1>
          <p className="mt-1 text-sm text-muted-foreground">博客内容与运行状态。</p>
        </div>
        <Button asChild size="sm">
          <Link to="/admin/posts/new">
            <Plus className="size-4" /> 写文章
          </Link>
        </Button>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>概览加载失败</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {!stats && !err && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat icon={FileText} label="文章" value={stats.total_posts} />
            <Stat icon={FolderTree} label="分类" value={stats.total_categories} />
            <Stat icon={Tags} label="标签" value={stats.total_tags} />
          </div>

          {stats.recent_posts && stats.recent_posts.length > 0 && (
            <Card className="mt-8">
              <CardHeader><CardTitle className="text-base">最近文章</CardTitle></CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {stats.recent_posts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/admin/posts/${p.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent/50"
                  >
                    <span className="truncate">{p.title || '(无标题)'}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{STATUS_NAME[p.status] ?? p.status}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {stats.system_info && (
            <p className="mt-8 text-xs text-muted-foreground">
              运行 {stats.system_info.uptime} · 内存 {stats.system_info.memory_usage} · 磁盘 {stats.system_info.disk_usage}
            </p>
          )}
        </>
      )}
    </div>
  )
}
