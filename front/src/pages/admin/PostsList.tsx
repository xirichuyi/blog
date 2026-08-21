import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ExternalLink, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminListPosts, deletePost, updatePost, STATUS_NAME, POST_STATUS, type AdminPost } from '@/services/admin'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  Published: '已发布',
  Draft: '草稿',
  Deleted: '已删除',
  Private: '私密',
}

function StatusBadge({ status }: { status: number }) {
  const name = STATUS_NAME[status] ?? String(status)
  return (
    <Badge
      variant="secondary"
      className={cn(
        'whitespace-nowrap border-transparent',
        status === POST_STATUS.Published && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        status === POST_STATUS.Draft && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      )}
    >
      {STATUS_LABEL[name] ?? name}
    </Badge>
  )
}

export default function PostsList() {
  const [posts, setPosts] = useState<AdminPost[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AdminPost | null>(null)

  const load = async () => {
    try {
      const result = await adminListPosts()
      setPosts(result.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)))
      setError('')
    } catch (loadError) {
      setError(String((loadError as Error).message || loadError))
    }
  }

  useEffect(() => {
    void load()
  }, [])

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
      await updatePost(post.id, {
        status: publishing ? POST_STATUS.Published : POST_STATUS.Draft,
      })
      await load()
      toast.success(publishing ? '文章已发布' : '文章已转为草稿')
    } catch (updateError) {
      toast.error('操作失败', { description: (updateError as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button asChild size="sm">
          <Link to="/admin/posts/new">
            <Plus /> 写文章
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>文章加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!posts && !error && (
        <Card>
          <CardContent className="space-y-3 p-4">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      )}

      {posts && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="hidden md:table-cell">分类</TableHead>
                  <TableHead className="hidden w-32 lg:table-cell">创建日期</TableHead>
                  <TableHead className="w-14 text-right"><span className="sr-only">操作</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-0 font-medium">
                      <Link to={`/admin/posts/${post.id}`} className="block truncate hover:underline">
                        {post.title || '(无标题)'}
                      </Link>
                    </TableCell>
                    <TableCell><StatusBadge status={post.status} /></TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {post.category_name || '未分类'}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                      {post.created_at?.slice(0, 10) || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={busy === post.id} aria-label={`操作：${post.title || '无标题'}`}>
                            {busy === post.id ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/posts/${post.id}`}><Pencil /> 编辑</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`/article/${post.id}`} target="_blank" rel="noreferrer"><ExternalLink /> 查看文章</a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void togglePublish(post)}>
                            {post.status === POST_STATUS.Published ? '转为草稿' : '发布文章'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setPendingDelete(post)}>
                            <Trash2 /> 删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {posts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">还没有文章。</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这篇文章？</AlertDialogTitle>
            <AlertDialogDescription>
              「{pendingDelete?.title || '无标题'}」删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy !== null}
              onClick={(event) => {
                event.preventDefault()
                void removePost()
              }}
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
