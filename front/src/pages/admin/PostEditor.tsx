import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, ImagePlus, X, Check } from 'lucide-react'
import {
  adminGetPost,
  createPost,
  updatePost,
  setPostTags,
  uploadImage,
  listCategories,
  listTags,
  createTag,
  POST_STATUS,
} from '@/services/admin'
import { imageUrl, type Category, type Tag } from '@/services/api'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: { value: number; label: string }[] = [
  { value: POST_STATUS.Published, label: '已发布' },
  { value: POST_STATUS.Draft, label: '草稿' },
  { value: POST_STATUS.Private, label: '私密' },
  { value: POST_STATUS.Deleted, label: '已删除' },
]

export default function PostEditor() {
  const { id } = useParams<{ id: string }>()
  const editing = !!id
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<number>(POST_STATUS.Draft)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<number[]>([])

  const [cats, setCats] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [newTag, setNewTag] = useState('')

  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'cover' | 'inline' | null>(null)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    Promise.all([listCategories(), listTags()]).then(([c, t]) => {
      setCats(c)
      setTags(t)
    })
  }, [])

  useEffect(() => {
    if (!id) return
    adminGetPost(id)
      .then((p) => {
        setTitle(p.title || '')
        setContent(p.content || '')
        setStatus(p.status)
        setCategoryId(p.category_id ?? null)
        setCoverUrl(p.cover_url ?? null)
        setTagIds((p.tags ?? []).map((t) => t.id))
      })
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false))
  }, [id])

  async function onPickImage(file: File, kind: 'cover' | 'inline') {
    setUploading(kind)
    setErr('')
    try {
      const url = await uploadImage(file)
      if (kind === 'cover') {
        setCoverUrl(url)
      } else {
        const snippet = `\n![](${url})\n`
        const ta = taRef.current
        if (ta) {
          const pos = ta.selectionStart ?? content.length
          setContent(content.slice(0, pos) + snippet + content.slice(pos))
        } else {
          setContent(content + snippet)
        }
      }
    } catch (e) {
      setErr('上传失败：' + (e as Error).message)
    } finally {
      setUploading(null)
    }
  }

  async function addTag() {
    const name = newTag.trim()
    if (!name) return
    const existing = tags.find((t) => t.name === name)
    try {
      if (existing) {
        if (!tagIds.includes(Number(existing.id))) setTagIds([...tagIds, Number(existing.id)])
      } else {
        const created = await createTag(name)
        setTags([...tags, { id: String(created.id), name: created.name, count: 0 }])
        setTagIds([...tagIds, created.id])
      }
      setNewTag('')
    } catch (e) {
      setErr('添加标签失败：' + (e as Error).message)
    }
  }

  function toggleTag(tid: number) {
    setTagIds((cur) => (cur.includes(tid) ? cur.filter((x) => x !== tid) : [...cur, tid]))
  }

  async function save() {
    if (!title.trim()) {
      setErr('标题不能为空')
      return
    }
    setSaving(true)
    setErr('')
    setSaved(false)
    try {
      const payload = { title: title.trim(), content, status, category_id: categoryId, cover_url: coverUrl }
      let postId: number
      if (editing) {
        await updatePost(Number(id), payload)
        postId = Number(id)
      } else {
        const created = await createPost(payload)
        postId = created.id
      }
      await setPostTags(postId, tagIds)
      setSaved(true)
      if (!editing) {
        navigate(`/admin/posts/${postId}`, { replace: true })
      }
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErr('保存失败：' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> 加载中…
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-4 mb-5 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mb-6 md:border-0 md:bg-transparent md:p-0">
        <button
          onClick={() => navigate('/admin/posts')}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> 文章
        </button>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-500">
              <Check className="size-4" /> 已保存
            </span>
          )}
          <Button onClick={save} disabled={saving} className="min-h-10 px-4" size="sm">
            {saving ? <Loader2 className="size-4 animate-spin" /> : '保存'}
          </Button>
        </div>
      </div>

      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        className="mb-4 h-12 border-0 bg-transparent px-0 text-xl font-bold shadow-none focus-visible:ring-0 sm:text-2xl"
      />

      {/* meta row */}
      <div className="mb-4 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(Number(e.target.value))}
          className="h-11 min-w-0 rounded-md border border-border bg-background px-2 text-base sm:h-9 sm:text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          className="h-11 min-w-0 rounded-md border border-border bg-background px-2 text-base sm:h-9 sm:text-sm"
        >
          <option value="">未分类</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* cover */}
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground sm:h-9 sm:justify-start sm:px-2">
          {uploading === 'cover' ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          封面
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPickImage(e.target.files[0], 'cover')}
          />
        </label>
        {coverUrl && (
          <span className="inline-flex items-center gap-1.5">
            <img src={imageUrl(coverUrl)} alt="" className="h-9 w-14 rounded object-cover" />
            <button onClick={() => setCoverUrl(null)} className="text-muted-foreground hover:text-destructive" title="移除封面">
              <X className="size-4" />
            </button>
          </span>
        )}
      </div>

      {/* tags */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {tags.map((t) => {
          const on = tagIds.includes(Number(t.id))
          return (
            <button
              key={t.id}
              onClick={() => toggleTag(Number(t.id))}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1 text-xs transition-colors sm:min-h-0 sm:px-2.5 sm:py-0.5',
                on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {on && '#'}
              {t.name}
            </button>
          )
        })}
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder="+ 新标签"
          className="h-9 w-28 rounded-full border border-dashed border-border bg-transparent px-3 text-base outline-none focus:border-primary sm:h-7 sm:w-24 sm:px-2.5 sm:text-xs"
        />
      </div>

      {/* editor tabs */}
      <div className="mb-2 flex items-center gap-1 border-b border-border">
        {(['write', 'preview'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-3 py-1.5 text-sm transition-colors',
              tab === t ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'write' ? '编辑' : '预览'}
          </button>
        ))}
        <label className="ml-auto inline-flex min-h-10 cursor-pointer items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
          {uploading === 'inline' ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          插入图片
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPickImage(e.target.files[0], 'inline')}
          />
        </label>
      </div>

      {tab === 'write' ? (
        <textarea
          ref={taRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="用 Markdown 写正文…"
          className="min-h-[calc(100dvh-22rem)] w-full resize-y rounded-lg border border-border bg-background p-4 font-mono text-base leading-relaxed outline-none focus:ring-1 focus:ring-ring md:min-h-[60vh] md:text-sm"
        />
      ) : (
        <div className="min-h-[60vh] rounded-lg border border-border p-4">
          {content.trim() ? <Markdown content={content} /> : <p className="text-sm text-muted-foreground">没有内容。</p>}
        </div>
      )}
    </div>
  )
}
