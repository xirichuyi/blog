import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CircleCheck,
  FileText,
  FolderTree,
  PenLine,
  Plus,
  Tags,
} from 'lucide-react'
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
    <div className="min-w-0 px-5 py-5 sm:px-7">
      <div className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
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
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-xl border bg-card px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="text-xs font-medium text-primary">CHUYI BLOG</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">今天想写点什么？</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">从一个想法开始，剩下的交给编辑器。</p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link to="/admin/posts/new"><Plus /> 写文章</Link>
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
          <section className="grid grid-cols-3 divide-x overflow-hidden rounded-xl border bg-card">
            <Stat label="全部文章" value={stats.total_posts} />
            <Stat label="内容分类" value={stats.total_categories} />
            <Stat label="常用标签" value={stats.total_tags} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
                <div>
                  <h3 className="text-sm font-semibold">最近文章</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">继续编辑或检查发布状态</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                  <Link to="/admin/posts">全部文章 <ArrowRight /></Link>
                </Button>
              </div>
              <div className="divide-y">
                {stats.recent_posts?.map((post) => (
                  <Link
                    key={post.id}
                    to={`/admin/posts/${post.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/55 sm:px-6"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-medium">{post.title || '(无标题)'}</strong>
                      <span className="mt-1 block text-xs text-muted-foreground">{shortDate(post.created_at)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {STATUS_LABEL[post.status] ?? STATUS_NAME[post.status] ?? post.status}
                    </span>
                  </Link>
                ))}
                {!stats.recent_posts?.length && (
                  <div className="px-6 py-14 text-center">
                    <PenLine className="mx-auto size-5 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">还没有文章，从第一篇开始吧。</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-semibold">快捷管理</h3>
                <div className="mt-3 space-y-1">
                  <QuickLink to="/admin/posts/new" icon={PenLine}>开始写作</QuickLink>
                  <QuickLink to="/admin/taxonomy" icon={FolderTree}>整理分类</QuickLink>
                  <QuickLink to="/admin/taxonomy" icon={Tags}>管理标签</QuickLink>
                  <QuickLink to="/admin/books" icon={BookOpen}>维护书架</QuickLink>
                </div>
              </section>

              {stats.system_info && (
                <section className="rounded-xl border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CircleCheck className="size-4 text-emerald-500" /> 站点运行正常
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">建站至今</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{stats.system_info.uptime}</p>
                  <p className="mt-2 text-xs text-muted-foreground">始于 2025 年 5 月 2 日</p>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

function QuickLink({ children, icon: Icon, to }: { children: React.ReactNode; icon: React.ElementType; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <Icon className="size-4" />
      <span className="flex-1">{children}</span>
      <ArrowRight className="size-3.5 opacity-50" />
    </Link>
  )
}
