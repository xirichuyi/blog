import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ChevronDown, ImagePlus, Loader2, Settings2, Tags, X } from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownEditor } from '@/components/admin/MarkdownEditor'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  adminGetPost,
  createPost,
  createTag,
  listCategories,
  listTags,
  POST_STATUS,
  updatePost,
} from '@/services/admin'
import { imageUrl, type Category, type Tag } from '@/services/api'
import { uploadImageDirect } from '@/services/upload'

const STATUS_OPTIONS: { value: number; label: string }[] = [
  { value: POST_STATUS.Published, label: '已发布' },
  { value: POST_STATUS.Draft, label: '草稿' },
  { value: POST_STATUS.Private, label: '私密' },
  { value: POST_STATUS.Deleted, label: '已删除' },
]

interface LocalPostDraft {
  title: string
  content: string
  status: number
  categoryId: number | null
  coverUrl: string | null
  tagIds: number[]
  savedAt: number
}

type PostDraftContent = Omit<LocalPostDraft, 'savedAt'>

const EMPTY_DRAFT: PostDraftContent = {
  title: '',
  content: '',
  status: POST_STATUS.Draft,
  categoryId: null,
  coverUrl: null,
  tagIds: [],
}

function draftKey(id?: string): string {
  return `chuyi:post-draft:${id ?? 'new'}`
}

function draftSnapshot(draft: PostDraftContent): string {
  return JSON.stringify({ ...draft, tagIds: [...draft.tagIds].sort((a, b) => a - b) })
}

function readLocalDraft(key: string): LocalPostDraft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(key) || 'null') as LocalPostDraft | null
    return draft && typeof draft.savedAt === 'number' ? draft : null
  } catch {
    return null
  }
}

export default function PostEditor() {
  const { id } = useParams<{ id: string }>()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<number>(POST_STATUS.Draft)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<number[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tagsList, setTagsList] = useState<Tag[]>([])
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'cover' | 'inline' | null>(null)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => draftSnapshot(EMPTY_DRAFT))
  const [localBackupSnapshot, setLocalBackupSnapshot] = useState('')

  const currentDraft = useMemo<PostDraftContent>(() => ({
    title,
    content,
    status,
    categoryId,
    coverUrl,
    tagIds,
  }), [categoryId, content, coverUrl, status, tagIds, title])
  const currentSnapshot = useMemo(() => draftSnapshot(currentDraft), [currentDraft])
  const dirty = hydrated && currentSnapshot !== lastSavedSnapshot

  function applyDraft(draft: PostDraftContent) {
    setTitle(draft.title)
    setContent(draft.content)
    setStatus(draft.status)
    setCategoryId(draft.categoryId)
    setCoverUrl(draft.coverUrl)
    setTagIds(draft.tagIds)
  }

  useEffect(() => {
    Promise.all([listCategories(), listTags()])
      .then(([nextCategories, nextTags]) => {
        setCategories(nextCategories)
        setTagsList(nextTags)
      })
      .catch((loadError) => {
        toast.error('分类和标签加载失败', { description: (loadError as Error).message })
      })
  }, [])

  useEffect(() => {
    if (!id) {
      const localDraft = readLocalDraft(draftKey())
      setLastSavedSnapshot(draftSnapshot(EMPTY_DRAFT))
      if (localDraft) {
        applyDraft(localDraft)
        setLocalBackupSnapshot(draftSnapshot(localDraft))
        toast.info('已恢复未保存的本地草稿')
      }
      setHydrated(true)
      return
    }
    adminGetPost(id)
      .then((post) => {
        const serverDraft: PostDraftContent = {
          title: post.title || '',
          content: post.content || '',
          status: post.status,
          categoryId: post.category_id ?? null,
          coverUrl: post.cover_url ?? null,
          tagIds: (post.tags ?? []).map((tag) => Number(tag.id)),
        }
        const serverSnapshot = draftSnapshot(serverDraft)
        const localDraft = readLocalDraft(draftKey(id))
        const serverUpdatedAt = Date.parse(post.updated_at || post.created_at || '') || 0
        setLastSavedSnapshot(serverSnapshot)
        if (localDraft && localDraft.savedAt > serverUpdatedAt) {
          applyDraft(localDraft)
          setLocalBackupSnapshot(draftSnapshot(localDraft))
          toast.info('已恢复未保存的本地草稿')
        } else {
          applyDraft(serverDraft)
          localStorage.removeItem(draftKey(id))
          setLocalBackupSnapshot('')
        }
        setHydrated(true)
      })
      .catch((loadError) => setError(String(loadError.message || loadError)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!hydrated || !dirty) return
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey(id), JSON.stringify({ ...currentDraft, savedAt: Date.now() }))
        setLocalBackupSnapshot(currentSnapshot)
      } catch {
        // The server save path still works if browser storage is unavailable.
      }
    }, 700)
    return () => window.clearTimeout(timer)
  }, [currentDraft, currentSnapshot, dirty, hydrated, id])

  useEffect(() => {
    if (!dirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty])

  async function pickCover(file: File) {
    setUploading('cover')
    try {
      const uploadedUrl = await uploadImageDirect(file)
      const updatedPost = editing
        ? await updatePost(Number(id), { cover_url: uploadedUrl })
        : null
      setCoverUrl(updatedPost?.cover_url ?? uploadedUrl)
      toast.success('封面已上传')
    } catch (uploadError) {
      toast.error('封面上传失败', { description: (uploadError as Error).message })
    } finally {
      setUploading(null)
    }
  }

  async function uploadInlineImage(file: File): Promise<string> {
    setUploading('inline')
    try {
      return await uploadImageDirect(file)
    } finally {
      setUploading(null)
    }
  }

  async function addTag() {
    const name = newTag.trim()
    if (!name) return
    const existing = tagsList.find((tag) => tag.name === name)
    try {
      if (existing) {
        setTagIds((current) => Array.from(new Set([...current, Number(existing.id)])))
      } else {
        const created = await createTag(name)
        setTagsList((current) => [...current, { id: String(created.id), name: created.name, count: 0 }])
        setTagIds((current) => [...current, created.id])
      }
      setNewTag('')
    } catch (tagError) {
      toast.error('添加标签失败', { description: (tagError as Error).message })
    }
  }

  function toggleTag(tagId: number) {
    setTagIds((current) => (
      current.includes(tagId) ? current.filter((value) => value !== tagId) : [...current, tagId]
    ))
  }

  async function save(statusOverride?: number) {
    if (!title.trim()) {
      toast.error('标题不能为空')
      return
    }
    setSaving(true)
    setError('')
    try {
      const nextStatus = statusOverride ?? status
      const payload = {
        title: title.trim(),
        content,
        status: nextStatus,
        category_id: categoryId,
        cover_url: coverUrl,
        tag_ids: tagIds,
      }
      let postId = Number(id)
      if (editing) {
        await updatePost(postId, payload)
      } else {
        postId = (await createPost(payload)).id
      }
      setTitle(payload.title)
      setStatus(nextStatus)
      const savedSnapshot = draftSnapshot({ ...currentDraft, title: payload.title, status: nextStatus })
      setLastSavedSnapshot(savedSnapshot)
      setLocalBackupSnapshot('')
      localStorage.removeItem(draftKey(id))
      toast.success(nextStatus === POST_STATUS.Published ? '文章已发布' : '文章已保存')
      if (!editing) navigate(`/admin/posts/${postId}`, { replace: true })
    } catch (saveError) {
      toast.error('保存失败', { description: (saveError as Error).message })
    } finally {
      setSaving(false)
    }
  }

  function leaveEditor() {
    if (dirty && !window.confirm('还有未保存到服务器的修改，确定离开吗？本地草稿仍会保留。')) return
    navigate('/admin/posts')
  }

  const saveState = saving
    ? '保存中…'
    : uploading
      ? '上传中…'
      : dirty
        ? localBackupSnapshot === currentSnapshot ? '已备份到本机' : '未保存'
        : editing ? '已保存' : '尚未保存'

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="animate-spin" /> 加载中…
      </div>
    )
  }

  return (
    <Sheet>
      <div
        className="admin-writing-mode"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault()
            void save()
          }
        }}
      >
      <header className="admin-editor-actions">
        <div className="admin-editor-actions-inner">
          <div className="admin-editor-actions-left">
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={leaveEditor}>
              <ArrowLeft /> <span className="admin-editor-back-label">返回文章</span>
            </Button>
            <span className="admin-editor-save-state">{saveState}</span>
          </div>
          <div className="admin-editor-actions-right">
          {status !== POST_STATUS.Published && (
            <Button variant="ghost" size="sm" className="admin-editor-save-draft h-8" disabled={saving || Boolean(uploading)} onClick={() => void save()}>
              {saving && <Loader2 className="animate-spin" />} 保存草稿
            </Button>
          )}
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Settings2 /> 设置
            </Button>
          </SheetTrigger>
          <Button
            onClick={() => void save(status === POST_STATUS.Published ? undefined : POST_STATUS.Published)}
            disabled={saving || Boolean(uploading)}
            size="sm"
            className="h-8"
          >
            {saving && <Loader2 className="animate-spin" />}
            {status === POST_STATUS.Published ? '更新' : '发布'}
          </Button>
          </div>
        </div>
      </header>

      <div className="admin-writing-canvas">

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle />
          <AlertTitle>文章加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="文章标题"
        aria-label="文章标题"
        autoComplete="off"
        autoCapitalize="sentences"
        className="admin-editor-title h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
      />

      <SheetContent className="admin-settings-sheet w-full overflow-y-auto p-4 sm:max-w-xs">
        <SheetHeader className="text-left">
          <SheetTitle>文章设置</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={String(status)} onValueChange={(value) => setStatus(Number(value))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>分类</Label>
            <Select
              value={categoryId === null ? 'none' : String(categoryId)}
              onValueChange={(value) => setCategoryId(value === 'none' ? null : Number(value))}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>标签</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="flex items-center gap-1.5"><Tags className="size-4" /> 已选 {tagIds.length}</span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
                <DropdownMenuLabel>选择标签</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tagsList.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={tagIds.includes(Number(tag.id))}
                    onCheckedChange={() => toggleTag(Number(tag.id))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {tag.name}
                  </DropdownMenuCheckboxItem>
                ))}
                {tagsList.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">暂无标签</p>}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void addTag()
                  }
                }}
                placeholder="新标签（回车添加）"
              />
              <Button variant="secondary" className="shrink-0" disabled={!newTag.trim()} onClick={() => void addTag()}>添加</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>封面</Label>
            <div className="flex items-center gap-2">
              {coverUrl && <img src={imageUrl(coverUrl)} alt="文章封面" className="h-8 w-12 rounded border object-cover" />}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void pickCover(file)
                  event.target.value = ''
                }}
              />
              <Button variant="outline" size="sm" className="h-8" onClick={() => coverInputRef.current?.click()} disabled={uploading === 'cover'}>
                {uploading === 'cover' ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                {coverUrl ? '更换' : '上传'}
              </Button>
              {coverUrl && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setCoverUrl(null)}>
                  <X /> 移除
                </Button>
              )}
            </div>
          </div>

          <div className="border-t pt-5">
            <Button variant="outline" className="w-full" disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="animate-spin" />} 保存当前状态
            </Button>
          </div>
        </div>
      </SheetContent>

      <MarkdownEditor
        value={content}
        onChange={setContent}
        onUploadImage={uploadInlineImage}
        uploadingImage={uploading === 'inline'}
      />
      </div>
      </div>
    </Sheet>
  )
}
