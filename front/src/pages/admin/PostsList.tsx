import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { adminListPosts, deletePost, updatePost, STATUS_NAME, POST_STATUS, type AdminPost } from '@/services/admin'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: number }) {
  const name = STATUS_NAME[status] ?? String(status)
  const tone =
    status === POST_STATUS.Published
      ? 'bg-emerald-500/15 text-emerald-500'
      : status === POST_STATUS.Draft
        ? 'bg-amber-500/15 text-amber-500'
        : 'bg-secondary text-muted-foreground'
  const label = { Published: '已发布', Draft: '草稿', Deleted: '已删除', Private: '私密' }[name] ?? name
  return <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', tone)}>{label}</span>
}

export default function PostsList() {
  const [posts, setPosts] = useState<AdminPost[] | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const load = () =>
    adminListPosts()
      .then((p) => setPosts(p.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))))
      .catch((e) => setErr(String(e.message || e)))

  useEffect(() => {
    load()
  }, [])

  async function onDelete(p: AdminPost) {
    if (!confirm(`确定删除「${p.title || '无标题'}」？此操作不可恢复。`)) return
    setBusy(p.id)
    try {
      await deletePost(p.id)
      await load()
    } catch (e) {
      alert('删除失败：' + (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function togglePublish(p: AdminPost) {
    const next = p.status === POST_STATUS.Published ? POST_STATUS.Draft : POST_STATUS.Published
    setBusy(p.id)
    try {
      await updatePost(p.id, { status: next })
      await load()
    } catch (e) {
      alert('操作失败：' + (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">文章 {posts && <span className="text-base font-normal text-muted-foreground">· {posts.length}</span>}</h1>
        <Button asChild size="sm">
          <Link to="/admin/posts/new">
            <Plus className="size-4" /> 写文章
          </Link>
        </Button>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {!posts && !err && (
        <div className="flex items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> 加载中…
        </div>
      )}

      {posts && (
        <div className="divide-y divide-border rounded-xl border border-border">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link to={`/admin/posts/${p.id}`} className="block truncate text-sm font-medium hover:text-primary">
                  {p.title || '(无标题)'}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={p.status} />
                  <span>{p.category_name || '未分类'}</span>
                  <span>· {p.created_at?.slice(0, 10)}</span>
                </div>
              </div>
              <button
                onClick={() => togglePublish(p)}
                disabled={busy === p.id}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {p.status === POST_STATUS.Published ? '转草稿' : '发布'}
              </button>
              <a
                href={`/article/${p.id}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="查看"
              >
                <ExternalLink className="size-4" />
              </a>
              <Link
                to={`/admin/posts/${p.id}`}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="编辑"
              >
                <Pencil className="size-4" />
              </Link>
              <button
                onClick={() => onDelete(p)}
                disabled={busy === p.id}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                title="删除"
              >
                {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>
          ))}
          {posts.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted-foreground">还没有文章。</p>}
        </div>
      )}
    </div>
  )
}
