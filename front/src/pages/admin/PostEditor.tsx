import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ChevronDown, ImagePlus, Loader2, Tags, X } from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownEditor } from '@/components/admin/MarkdownEditor'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  adminGetPost,
  createPost,
  createTag,
  listCategories,
  listTags,
  POST_STATUS,
  replacePostCover,
  updatePost,
  uploadImage,
} from '@/services/admin'
import { imageUrl, type Category, type Tag } from '@/services/api'

const STATUS_OPTIONS: { value: number; label: string }[] = [
  { value: POST_STATUS.Published, label: '已发布' },
  { value: POST_STATUS.Draft, label: '草稿' },
  { value: POST_STATUS.Private, label: '私密' },
  { value: POST_STATUS.Deleted, label: '已删除' },
]

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
    if (!id) return
    adminGetPost(id)
      .then((post) => {
        setTitle(post.title || '')
        setContent(post.content || '')
        setStatus(post.status)
        setCategoryId(post.category_id ?? null)
        setCoverUrl(post.cover_url ?? null)
        setTagIds((post.tags ?? []).map((tag) => Number(tag.id)))
      })
      .catch((loadError) => setError(String(loadError.message || loadError)))
      .finally(() => setLoading(false))
  }, [id])

  async function pickCover(file: File) {
    setUploading('cover')
    try {
      const updatedPost = editing ? await replacePostCover(Number(id), file) : null
      setCoverUrl(updatedPost?.cover_url ?? (await uploadImage(file)))
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
      return await uploadImage(file)
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

  async function save() {
    if (!title.trim()) {
      toast.error('标题不能为空')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: title.trim(),
        content,
        status,
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
      toast.success('文章已保存')
      if (!editing) navigate(`/admin/posts/${postId}`, { replace: true })
    } catch (saveError) {
      toast.error('保存失败', { description: (saveError as Error).message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="animate-spin" /> 加载中…
      </div>
    )
  }

  return (
    <div
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          void save()
        }
      }}
    >
      <div className="sticky top-14 z-30 -mx-4 mb-6 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button variant="ghost" onClick={() => navigate('/admin/posts')}>
          <ArrowLeft /> 文章
        </Button>
        <Button onClick={() => void save()} disabled={saving} size="sm">
          {saving && <Loader2 className="animate-spin" />} 保存
        </Button>
      </div>

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
        className="mb-4 h-12 border-0 bg-transparent px-0 text-xl font-bold shadow-none focus-visible:ring-0 sm:text-2xl"
      />

      <Card className="mb-5 shadow-none">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[180px_220px_1fr]">
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={String(status)} onValueChange={(value) => setStatus(Number(value))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label>标签</Label>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-32 justify-between font-normal">
                    <span className="flex items-center gap-2"><Tags /> 已选 {tagIds.length}</span>
                    <ChevronDown />
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
              <Input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void addTag()
                  }
                }}
                placeholder="新标签"
                className="min-w-0"
              />
              <Button variant="secondary" disabled={!newTag.trim()} onClick={() => void addTag()}>添加</Button>
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label>封面</Label>
            <div className="flex flex-wrap items-center gap-3">
              {coverUrl && <img src={imageUrl(coverUrl)} alt="文章封面" className="h-16 w-24 rounded-md border object-cover" />}
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
              <Button variant="outline" onClick={() => coverInputRef.current?.click()} disabled={uploading === 'cover'}>
                {uploading === 'cover' ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                {coverUrl ? '更换封面' : '上传封面'}
              </Button>
              {coverUrl && (
                <Button variant="ghost" onClick={() => setCoverUrl(null)}>
                  <X /> 移除
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <MarkdownEditor
        value={content}
        onChange={setContent}
        onUploadImage={uploadInlineImage}
        uploadingImage={uploading === 'inline'}
      />
    </div>
  )
}
