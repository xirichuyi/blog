import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ExternalLink, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { adminListPosts, deletePost, updatePost, POST_STATUS, type AdminPost } from '@/services/admin'
import { cn } from '@/lib/utils'

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: String(POST_STATUS.Published), label: '已发布' },
  { value: String(POST_STATUS.Draft), label: '草稿' },
  { value: String(POST_STATUS.Private), label: '私密' },
]

const STATUS_LABEL: Record<number, string> = {
  [POST_STATUS.Published]: '已发布',
  [POST_STATUS.Draft]: '草稿',
  [POST_STATUS.Deleted]: '已删除',
  [POST_STATUS.Private]: '私密',
}

function Status({ value }: { value: number }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
      value === POST_STATUS.Published && 'text-emerald-600',
      value === POST_STATUS.Draft && 'text-amber-600',
    )}>
      <i className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[value] ?? value}
    </span>
  )
}

function formatDate(value?: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

export default function PostsList() {
  const [posts, setPosts] = useState<AdminPost[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AdminPost | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const load = async () => {
    try {
      const result = await adminListPosts()
      setPosts(result.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)))
      setError('')
    } catch (loadError) {
      setError(String((loadError as Error).message || loadError))
    }
  }

  useEffect(() => { void load() }, [])

  const visiblePosts = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase()
    return (posts ?? []).filter((post) => {
      if (filter !== 'all' && post.status !== Number(filter)) return false
      if (!keyword) return true
      return [post.title, post.category_name, ...(post.tags?.map((tag) => tag.name) ?? [])]
        .some((value) => value?.toLocaleLowerCase().includes(keyword))
    })
  }, [filter, posts, query])

  async function removePost() {
    if (!pendingDelete) return
    const post = pendingDelete
    setBusy(post.id)
    try {
      await deletePost(post.id)
      await load()
      setPendingDelete(null)
      toast.success('文章已删除')
    } catch (deleteError) {
      toast.error('删除失败', { description: (deleteError as Error).message })
    } finally {
      setBusy(null)
    }
  }

  async function togglePublish(post: AdminPost) {
    const publishing = post.status !== POST_STATUS.Published
    setBusy(post.id)
    try {
      await updatePost(post.id, { status: publishing ? POST_STATUS.Published : POST_STATUS.Draft })
      await load()
      toast.success(publishing ? '文章已发布' : '文章已转为草稿')
    } catch (updateError) {
      toast.error('操作失败', { description: (updateError as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、分类或标签" className="pl-9" />
        </div>
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                'shrink-0 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors',
                filter === item.value && 'bg-card font-medium text-foreground shadow-sm',
              )}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button asChild className="shrink-0"><Link to="/admin/posts/new"><Plus /> 写文章</Link></Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>文章加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!posts && !error && (
        <div className="space-y-1 overflow-hidden rounded-xl border bg-card p-3">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}
        </div>
      )}

      {posts && (
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3 text-xs text-muted-foreground">
            <span>{visiblePosts.length} 篇文章</span>
            <span className="hidden sm:inline">按创建时间排序</span>
          </div>
          <div className="divide-y">
            {visiblePosts.map((post) => (
              <article key={post.id} className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/45 sm:px-6">
                <Link to={`/admin/posts/${post.id}`} className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-medium text-foreground group-hover:text-primary">{post.title || '(无标题)'}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                    <Status value={post.status} />
                    <span>{post.category_name || '未分类'}</span>
                    <span>{formatDate(post.created_at)}</span>
                    {post.tags?.slice(0, 2).map((tag) => <span key={tag.id}>#{tag.name}</span>)}
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100" disabled={busy === post.id} aria-label={`操作：${post.title || '无标题'}`}>
                      {busy === post.id ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link to={`/admin/posts/${post.id}`}><Pencil /> 编辑</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><a href={`/article/${post.id}`} target="_blank" rel="noreferrer"><ExternalLink /> 查看文章</a></DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void togglePublish(post)}>{post.status === POST_STATUS.Published ? '转为草稿' : '发布文章'}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setPendingDelete(post)}><Trash2 /> 删除</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </article>
            ))}
            {visiblePosts.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium">没有找到文章</p>
                <p className="mt-1 text-xs text-muted-foreground">试试调整搜索内容或状态筛选。</p>
              </div>
            )}
          </div>
        </section>
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这篇文章？</AlertDialogTitle>
            <AlertDialogDescription>「{pendingDelete?.title || '无标题'}」删除后无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy !== null}
              onClick={(event) => { event.preventDefault(); void removePost() }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy !== null && <Loader2 className="animate-spin" />} 删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
