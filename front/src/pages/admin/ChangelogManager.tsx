import { useEffect, useState } from 'react'
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { adminListChangelog, createChangelog, deleteChangelog, updateChangelog, type ChangelogPayload } from '@/services/admin'
import type { ChangelogEntry } from '@/services/api'

const EMPTY: ChangelogPayload = { version: '', title: '', content: '', status: 1 }

export default function ChangelogManager() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null)
  const [editing, setEditing] = useState<ChangelogEntry | 'new' | null>(null)
  const [form, setForm] = useState<ChangelogPayload>(EMPTY)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try { setEntries(await adminListChangelog()) }
    catch (error) { toast.error('更新日志加载失败', { description: (error as Error).message }) }
  }

  useEffect(() => { void refresh() }, [])

  const openEdit = (entry: ChangelogEntry) => {
    setForm({ version: entry.version, title: entry.title, content: entry.content, published_at: entry.published_at, status: entry.status })
    setEditing(entry)
  }

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return
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

  const remove = async (entry: ChangelogEntry) => {
    if (!window.confirm(`确定删除“${entry.title}”吗？`)) return
    try { await deleteChangelog(entry.id); await refresh(); toast.success('更新日志已删除') }
    catch (error) { toast.error('删除失败', { description: (error as Error).message }) }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setForm({ ...EMPTY }); setEditing('new') }}><Plus /> 新增记录</Button>
      </div>
      {!entries && <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="animate-spin" /> 加载中…</div>}
      <div className="space-y-3">
        {entries?.map((entry) => (
          <Card key={entry.id}>
            <CardHeader className="flex-row items-start gap-3 space-y-0 p-4">
              <div className="min-w-0 flex-1"><CardTitle className="text-lg">{entry.title}</CardTitle><CardDescription className="mt-1">{entry.version || '无版本号'} · {new Date(entry.published_at).toLocaleString('zh-CN')} · {entry.status === 1 ? '已发布' : '草稿'}</CardDescription></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`操作：${entry.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openEdit(entry)}><Pencil /> 编辑</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void remove(entry)}><Trash2 /> 删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="px-4 pb-4"><p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{entry.content}</p></CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing === 'new' ? '新增更新记录' : '编辑更新记录'}</DialogTitle><DialogDescription>正文支持 Markdown。</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="标题"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="版本号"><Input value={form.version} placeholder="例如 v2.4.0" onChange={(event) => setForm({ ...form, version: event.target.value })} /></Field>
              <Field label="发布时间"><Input type="datetime-local" value={form.published_at ? form.published_at.slice(0, 16) : ''} onChange={(event) => setForm({ ...form, published_at: event.target.value ? new Date(event.target.value).toISOString() : undefined })} /></Field>
              <Field label="状态"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}><option value={1}>发布</option><option value={0}>草稿</option></select></Field>
            </div>
            <Field label="正文"><Textarea className="min-h-64 font-mono leading-relaxed" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="- 增加了…\n- 修复了…" /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>取消</Button><Button disabled={busy || !form.title.trim() || !form.content.trim()} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} 保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
