import { useEffect, useState } from 'react'
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { PageActions } from '@/components/admin/PageActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { adminListChangelog, createChangelog, deleteChangelog, updateChangelog, type ChangelogPayload } from '@/services/admin'
import type { ChangelogEntry } from '@/services/api'

const EMPTY: ChangelogPayload = { version: '', title: '', content: '', status: 1 }

const publishedFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// <input type="datetime-local"> works in local wall-clock time; the API stores UTC.
function toLocalInput(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export default function ChangelogManager() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null)
  const [editing, setEditing] = useState<ChangelogEntry | 'new' | null>(null)
  const [form, setForm] = useState<ChangelogPayload>(EMPTY)
  const [pendingDelete, setPendingDelete] = useState<ChangelogEntry | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try { setEntries(await adminListChangelog()) }
    catch (error) { toast.error('更新日志加载失败', { description: (error as Error).message }) }
  }

  useEffect(() => { void refresh() }, [])

  const openCreate = () => {
    setForm({ ...EMPTY })
    setEditing('new')
  }

  const openEdit = (entry: ChangelogEntry) => {
    setForm({ version: entry.version, title: entry.title, content: entry.content, published_at: entry.published_at, status: entry.status })
    setEditing(entry)
  }

  const save = async () => {
    if (busy || !form.title.trim() || !form.content.trim()) return
    setBusy(true)
    try {
      if (editing === 'new') await createChangelog(form)
      else if (editing) await updateChangelog(editing.id, form)
      await refresh()
      setEditing(null)
      toast.success('更新日志已保存')
    } catch (error) {
      toast.error('保存失败', { description: (error as Error).message })
    } finally { setBusy(false) }
  }

  const remove = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteChangelog(pendingDelete.id)
      setPendingDelete(null)
      await refresh()
      toast.success('更新日志已删除')
    } catch (error) {
      toast.error('删除失败', { description: (error as Error).message })
    } finally { setBusy(false) }
  }

  return (
    <div>
      <PageActions>
        <Button size="sm" onClick={openCreate}><Plus /> 新增记录</Button>
      </PageActions>
      {!entries && <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="animate-spin" /> 加载中…</div>}
      <div className="space-y-3">
        {entries?.map((entry) => (
          <Card key={entry.id}>
            <CardHeader className="flex-row items-start gap-3 space-y-0 p-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg">{entry.title}</CardTitle>
                <CardDescription className="mt-1">
                  {entry.version || '无版本号'} · {publishedFormat.format(new Date(entry.published_at))} · {entry.status === 1 ? '已发布' : '草稿'}
                </CardDescription>
              </div>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`操作：${entry.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openEdit(entry)}><Pencil /> 编辑</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setPendingDelete(entry)}><Trash2 /> 删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="px-4 pb-4"><p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{entry.content}</p></CardContent>
          </Card>
        ))}
        {entries?.length === 0 && (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
            还没有更新记录。
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && !busy && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing === 'new' ? '新增更新记录' : '编辑更新记录'}</DialogTitle><DialogDescription>正文支持 Markdown。</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="标题" htmlFor="changelog-title"><Input id="changelog-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="版本号" htmlFor="changelog-version"><Input id="changelog-version" value={form.version} placeholder="例如 v2.4.0" onChange={(event) => setForm({ ...form, version: event.target.value })} /></Field>
              <Field label="发布时间" htmlFor="changelog-published">
                <Input
                  id="changelog-published"
                  type="datetime-local"
                  value={toLocalInput(form.published_at)}
                  onChange={(event) => setForm({ ...form, published_at: fromLocalInput(event.target.value) })}
                />
                {editing === 'new' && !form.published_at && (
                  <p className="text-xs text-muted-foreground">留空则使用保存时的时间。</p>
                )}
              </Field>
              <Field label="状态" htmlFor="changelog-status">
                <Select value={String(form.status)} onValueChange={(value) => setForm({ ...form, status: Number(value) })}>
                  <SelectTrigger id="changelog-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">发布</SelectItem>
                    <SelectItem value="0">草稿</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="正文" htmlFor="changelog-content">
              <Textarea
                id="changelog-content"
                className="min-h-64 font-mono leading-relaxed"
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                placeholder={'- 增加了…\n- 修复了…'}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setEditing(null)}>取消</Button>
            <Button disabled={busy || !form.title.trim() || !form.content.trim()} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} 保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !busy && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{pendingDelete?.title}」？</AlertDialogTitle>
            <AlertDialogDescription>这条更新记录会从公开的更新日志中移除，无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => { event.preventDefault(); void remove() }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy && <Loader2 className="animate-spin" />} 删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>
}
