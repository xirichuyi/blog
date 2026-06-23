import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Check, X, Pencil } from 'lucide-react'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listTags,
  createTag,
  updateTag,
  deleteTag,
} from '@/services/admin'
import type { Category, Tag } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Item = Category | Tag

function Section({
  title,
  load,
  create,
  rename,
  remove,
}: {
  title: string
  load: () => Promise<Item[]>
  create: (name: string) => Promise<unknown>
  rename: (id: string, name: string) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
}) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const refresh = () => load().then(setItems).catch((e) => setErr(String(e.message || e)))
  useEffect(() => {
    refresh()
  }, [])

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setErr('')
    try {
      await fn()
      await refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border p-5">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>

      <div className="mb-4 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && run(async () => (await create(name.trim()), setName('')))}
          placeholder={`新增${title}`}
          className="h-9"
        />
        <Button
          size="sm"
          disabled={busy || !name.trim()}
          onClick={() => run(async () => (await create(name.trim()), setName('')))}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {err && <p className="mb-3 text-xs text-destructive">{err}</p>}

      <div className="flex flex-col gap-1">
        {!items && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {items?.map((it) => (
          <div key={it.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
            {editing?.id === it.id ? (
              <>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ id: it.id, name: e.target.value })}
                  className="h-7 flex-1"
                  autoFocus
                />
                <button
                  className="text-emerald-500 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => run(async () => (await rename(it.id, editing.name.trim()), setEditing(null)))}
                >
                  <Check className="size-4" />
                </button>
                <button className="text-muted-foreground" onClick={() => setEditing(null)}>
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{it.name}</span>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setEditing({ id: it.id, name: it.name })}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  disabled={busy}
                  onClick={() => confirm(`删除「${it.name}」？`) && run(() => remove(it.id))}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
        {items?.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">空</p>}
      </div>
    </div>
  )
}

export default function Taxonomy() {
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold tracking-tight">分类 / 标签</h1>
      <div className="grid gap-5 sm:grid-cols-2">
        <Section title="分类" load={listCategories} create={createCategory} rename={updateCategory} remove={deleteCategory} />
        <Section
          title="标签"
          load={listTags}
          create={(n) => createTag(n)}
          rename={updateTag}
          remove={deleteTag}
        />
      </div>
    </div>
  )
}
