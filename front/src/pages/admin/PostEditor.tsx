import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ExternalLink, ImagePlus, Loader2, PanelRight, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownEditor } from '@/components/admin/MarkdownEditor'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
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

function storeDraft(key: string, draft: PostDraftContent): boolean {
  try { localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() })); return true } catch { return false }
}

function removeDraft(key: string) {
  try { localStorage.removeItem(key) } catch { /* Server save success is independent of local storage. */ }
}

/** Single-line title that wraps and grows instead of clipping long titles. */
function TitleField({ value, onChange, autoFocus = false }: { value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const fit = () => {
      element.style.height = 'auto'
      element.style.height = `${element.scrollHeight}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\s*\n\s*/g, ' '))}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.preventDefault()
      }}
      autoFocus={autoFocus}
      placeholder="文章标题"
      aria-label="文章标题"
      autoComplete="off"
      autoCapitalize="sentences"
      className="admin-editor-title block w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground/60"
    />
  )
}

const PROPERTIES_PREF = 'chuyi:editor-properties'
const WIDE_LAYOUT = '(min-width: 1024px)'

function readPropertiesPreference(): boolean {
  try { return localStorage.getItem(PROPERTIES_PREF) !== 'hidden' } catch { return true }
}

interface PropertiesProps {
  status: number
  onStatus: (value: number) => void
  categoryId: number | null
  onCategory: (value: number | null) => void
  categories: Category[]
  tagIds: number[]
  tagsList: Tag[]
  onToggleTag: (id: number) => void
  newTag: string
  onNewTag: (value: string) => void
  onAddTag: () => void
  coverUrl: string | null
  coverUploading: boolean
  uploadDisabled: boolean
  onPickCover: () => void
  onRemoveCover: () => void
}

/** Everything about a post except its words: always visible beside the draft. */
function PostProperties(props: PropertiesProps) {
  const keyword = props.newTag.trim().toLocaleLowerCase()
  const suggestions = props.tagsList
    .filter((tag) => !props.tagIds.includes(Number(tag.id)))
    .filter((tag) => !keyword || tag.name.toLocaleLowerCase().includes(keyword))
    .slice(0, 12)

  return (
    <div className="admin-properties-body">
      <div className="admin-property">
        <Label htmlFor="post-status">状态</Label>
        <Select value={String(props.status)} onValueChange={(value) => props.onStatus(Number(value))}>
          <SelectTrigger id="post-status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="admin-property">
        <Label htmlFor="post-category">分类</Label>
        <Select
          value={props.categoryId === null ? 'none' : String(props.categoryId)}
          onValueChange={(value) => props.onCategory(value === 'none' ? null : Number(value))}
        >
          <SelectTrigger id="post-category" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">未分类</SelectItem>
            {props.categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="admin-property">
        <Label htmlFor="post-new-tag">标签</Label>
        {props.tagIds.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="已选标签">
            {props.tagIds.map((tagId) => {
              const tag = props.tagsList.find((item) => Number(item.id) === tagId)
              return (
                <li key={tagId} className="admin-tag-chip">
                  {tag?.name ?? `#${tagId}`}
                  <button type="button" aria-label={`移除标签 ${tag?.name ?? tagId}`} onClick={() => props.onToggleTag(tagId)}>
                    <X className="size-3" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <Input
          id="post-new-tag"
          value={props.newTag}
          onChange={(event) => props.onNewTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              props.onAddTag()
            }
          }}
          placeholder="输入标签，回车添加"
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="可选标签">
            {suggestions.map((tag) => (
              <button key={tag.id} type="button" className="admin-tag-suggestion" onClick={() => props.onToggleTag(Number(tag.id))}>
                <Plus className="size-3" /> {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="admin-property">
        <span className="text-sm font-medium leading-none">封面</span>
        {props.coverUrl ? (
          <>
            <img src={imageUrl(props.coverUrl)} alt="文章封面" className="aspect-[1200/630] w-full rounded-md border object-cover" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 flex-1" onClick={props.onPickCover} disabled={props.uploadDisabled}>
                {props.coverUploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} 更换
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={props.onRemoveCover}>
                <X /> 移除
              </Button>
            </div>
          </>
        ) : (
          <button type="button" className="admin-cover-drop" onClick={props.onPickCover} disabled={props.uploadDisabled}>
            {props.coverUploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {props.coverUploading ? '上传中…' : '上传封面'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function PostEditor() {
  const { id } = useParams<{ id: string }>()
  return <PostEditorSession key={id ?? 'new'} />
}

function PostEditorSession() {
  const { id } = useParams<{ id: string }>()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const inlineUploadCountRef = useRef(0)
  const savingRef = useRef(false)

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
  const [propertiesOpen, setPropertiesOpen] = useState(readPropertiesPreference)
  const [propertiesSheetOpen, setPropertiesSheetOpen] = useState(false)
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
  const latestDraft = useRef({ draft: currentDraft, dirty })
  latestDraft.current = { draft: currentDraft, dirty }

  useEffect(() => () => {
    if (latestDraft.current.dirty) storeDraft(draftKey(id), latestDraft.current.draft)
  }, [id])

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
          removeDraft(draftKey(id))
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
      storeDraft(draftKey(id), latestDraft.current.draft)
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty, id])

  async function pickCover(file: File) {
    setUploading('cover')
    try {
      const uploadedUrl = await uploadImageDirect(file)
      setCoverUrl(uploadedUrl)
      toast.success('封面已上传，保存文章后生效')
    } catch (uploadError) {
      toast.error('封面上传失败', { description: (uploadError as Error).message })
    } finally {
      setUploading(null)
    }
  }

  async function uploadInlineImage(file: File): Promise<string> {
    inlineUploadCountRef.current += 1
    setUploading('inline')
    try {
      return await uploadImageDirect(file)
    } finally {
      inlineUploadCountRef.current -= 1
      if (inlineUploadCountRef.current === 0) {
        setUploading((current) => current === 'inline' ? null : current)
      }
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
    if (!hydrated || savingRef.current) return
    if (uploading) { toast.info('请等待图片上传完成'); return }
    if (!title.trim()) {
      toast.error('标题不能为空')
      return
    }
    savingRef.current = true
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
      const latest = latestDraft.current.draft
      const afterSave = { ...latest,
        title: latest.title === currentDraft.title ? payload.title : latest.title,
        status: latest.status === currentDraft.status ? nextStatus : latest.status,
      }
      setTitle(afterSave.title)
      setStatus(afterSave.status)
      const savedSnapshot = draftSnapshot({ ...currentDraft, title: payload.title, status: nextStatus })
      const stillDirty = draftSnapshot(afterSave) !== savedSnapshot
      setLastSavedSnapshot(savedSnapshot)
      setLocalBackupSnapshot('')
      removeDraft(draftKey(id))
      if (stillDirty && storeDraft(draftKey(String(postId)), afterSave)) {
        setLocalBackupSnapshot(draftSnapshot(afterSave))
      }
      // New-post drafts have moved to the assigned ID before navigation.
      latestDraft.current = { draft: afterSave, dirty: editing && stillDirty }
      toast.success(nextStatus === POST_STATUS.Published ? '文章已发布' : '文章已保存')
      if (!editing) navigate(`/admin/posts/${postId}`, { replace: true })
    } catch (saveError) {
      toast.error('保存失败', { description: (saveError as Error).message })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function leaveEditor() {
    if (dirty && !window.confirm('还有未保存到服务器的修改，确定离开吗？')) return
    if (dirty) storeDraft(draftKey(id), latestDraft.current.draft)
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

  function toggleProperties() {
    if (!window.matchMedia(WIDE_LAYOUT).matches) {
      setPropertiesSheetOpen(true)
      return
    }
    setPropertiesOpen((open) => {
      try { localStorage.setItem(PROPERTIES_PREF, open ? 'hidden' : 'shown') } catch { /* Preference only. */ }
      return !open
    })
  }

  const properties = (
    <PostProperties
      status={status}
      onStatus={setStatus}
      categoryId={categoryId}
      onCategory={setCategoryId}
      categories={categories}
      tagIds={tagIds}
      tagsList={tagsList}
      onToggleTag={toggleTag}
      newTag={newTag}
      onNewTag={setNewTag}
      onAddTag={() => void addTag()}
      coverUrl={coverUrl}
      coverUploading={uploading === 'cover'}
      uploadDisabled={Boolean(uploading)}
      onPickCover={() => coverInputRef.current?.click()}
      onRemoveCover={() => setCoverUrl(null)}
    />
  )

  return (
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
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={leaveEditor} aria-label="返回文章">
              <ArrowLeft /> <span className="admin-editor-back-label">文章</span>
            </Button>
            <span className="admin-editor-save-state">{saveState}</span>
          </div>
          <div className="admin-editor-actions-right">
            {editing && status === POST_STATUS.Published && (
              <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                <a href={`/article/${id}`} target="_blank" rel="noreferrer" aria-label="在博客中查看文章">
                  <ExternalLink /> <span className="admin-editor-view-label">查看</span>
                </a>
              </Button>
            )}
            {status !== POST_STATUS.Published && (
              <Button variant="ghost" size="sm" className="admin-editor-save-draft h-8" disabled={saving || Boolean(uploading)} onClick={() => void save()}>
                {saving && <Loader2 className="animate-spin" />} 保存草稿
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className={cn('admin-properties-toggle h-8', propertiesOpen && 'is-open')}
              aria-pressed={propertiesOpen}
              onClick={toggleProperties}
            >
              <PanelRight /> 属性
            </Button>
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

      <div className={cn('admin-editor-layout', propertiesOpen && 'has-properties')}>
        <div className="admin-writing-canvas">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle />
              <AlertTitle>文章加载失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TitleField value={title} onChange={setTitle} autoFocus={!editing} />

          <MarkdownEditor
            key={id ?? 'new'}
            value={content}
            onChange={setContent}
            onUploadImage={uploadInlineImage}
            uploadingImage={Boolean(uploading)}
          />
        </div>

        {propertiesOpen && (
          <aside className="admin-properties" aria-label="文章属性">
            <h2 className="admin-properties-title">文章属性</h2>
            {properties}
          </aside>
        )}
      </div>

      <Sheet open={propertiesSheetOpen} onOpenChange={setPropertiesSheetOpen}>
        <SheetContent side="bottom" className="admin-settings-sheet max-h-[85svh] overflow-y-auto p-4">
          <SheetHeader className="text-left">
            <SheetTitle>文章属性</SheetTitle>
            <SheetDescription className="sr-only">状态、分类、标签和封面</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{properties}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
