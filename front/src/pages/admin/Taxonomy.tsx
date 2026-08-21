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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  listCategories,
  listTags,
  updateCategory,
  updateTag,
} from '@/services/admin'
import type { Category, Tag } from '@/services/api'

type Item = Category | Tag

interface SectionProps {
  title: string
  load: () => Promise<Item[]>
  create: (name: string) => Promise<unknown>
  rename: (id: string, name: string) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
}

function Section({ title, load, create, rename, remove }: SectionProps) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [editName, setEditName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setItems(await load())
    } catch (error) {
      toast.error(`${title}加载失败`, { description: (error as Error).message })
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function createItem() {
    const nextName = name.trim()
    if (!nextName) return
    setBusy(true)
    try {
      await create(nextName)
      setName('')
      await refresh()
      toast.success(`${title}已添加`)
    } catch (error) {
      toast.error('添加失败', { description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function renameItem() {
    const nextName = editName.trim()
    if (!editing || !nextName) return
    setBusy(true)
    try {
      await rename(String(editing.id), nextName)
      setEditing(null)
      await refresh()
      toast.success(`${title}已更新`)
    } catch (error) {
      toast.error('更新失败', { description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function deleteItem() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await remove(String(pendingDelete.id))
      setPendingDelete(null)
      await refresh()
      toast.success(`${title}已删除`)
    } catch (error) {
      toast.error('删除失败', { description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="mb-4 flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void createItem()
            }}
            placeholder={`新增${title}`}
          />
          <Button size="icon" disabled={busy || !name.trim()} onClick={() => void createItem()} aria-label={`新增${title}`}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          </Button>
        </div>

        <div className="divide-y divide-border rounded-md border">
          {!items && (
            <div className="flex h-20 items-center justify-center text-muted-foreground">
              <Loader2 className="animate-spin" />
            </div>
          )}
          {items?.map((item) => (
            <div key={item.id} className="flex min-h-11 items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`操作：${item.name}`}><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => {
                    setEditing(item)
                    setEditName(item.name)
                  }}><Pencil /> 重命名</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setPendingDelete(item)}><Trash2 /> 删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {items?.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">暂无内容</p>}
        </div>
      </CardContent>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名{title}</DialogTitle>
            <DialogDescription>修改后，已关联内容会继续保留。</DialogDescription>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void renameItem()
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
            <Button disabled={busy || !editName.trim()} onClick={() => void renameItem()}>
              {busy && <Loader2 className="animate-spin" />} 保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{pendingDelete?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>这个操作无法撤销，请确认它没有被重要内容使用。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                void deleteItem()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy && <Loader2 className="animate-spin" />} 删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default function Taxonomy() {
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title="分类"
          load={listCategories}
          create={createCategory}
          rename={updateCategory}
          remove={deleteCategory}
        />
        <Section
          title="标签"
          load={listTags}
          create={createTag}
          rename={updateTag}
          remove={deleteTag}
        />
      </div>
    </div>
  )
}
