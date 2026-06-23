import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, FolderTree, Tags, Plus } from 'lucide-react'
import { getDashboard, STATUS_NAME, type DashboardStats } from '@/services/admin'
import { Button } from '@/components/ui/button'

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
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
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">概览</h1>
        <Button asChild size="sm">
          <Link to="/admin/posts/new">
            <Plus className="size-4" /> 写文章
          </Link>
        </Button>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat icon={FileText} label="文章" value={stats.total_posts} />
            <Stat icon={FolderTree} label="分类" value={stats.total_categories} />
            <Stat icon={Tags} label="标签" value={stats.total_tags} />
          </div>

          {stats.recent_posts && stats.recent_posts.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">最近文章</h2>
              <div className="divide-y divide-border rounded-xl border border-border">
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
              </div>
            </div>
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
