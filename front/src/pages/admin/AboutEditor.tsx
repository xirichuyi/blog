import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Markdown } from '@/components/Markdown'
import { PageActions } from '@/components/admin/PageActions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getAboutRaw, updateAbout } from '@/services/admin'
import { imageUrl } from '@/services/api'
import { uploadImageDirect } from '@/services/upload'

export default function AboutEditor() {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const snapshot = useMemo(
    () => JSON.stringify({ title, subtitle, content, photoUrl }),
    [content, photoUrl, subtitle, title],
  )
  // A failed load must never be saved back: it would overwrite the page with blanks.
  const loaded = !loading && !error
  const dirty = loaded && snapshot !== savedSnapshot

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    getAboutRaw()
      .then((about) => {
        const next = {
          title: about.title || '',
          subtitle: about.subtitle || '',
          content: about.content || '',
          photoUrl: (about as { photo_url?: string }).photo_url ?? null,
        }
        setTitle(next.title)
        setSubtitle(next.subtitle)
        setContent(next.content)
        setPhotoUrl(next.photoUrl)
        setSavedSnapshot(JSON.stringify(next))
      })
      .catch((loadError) => setError(String(loadError.message || loadError)))
      .finally(() => setLoading(false))
  }, [])

  async function uploadPhoto(file: File) {
    setUploading(true)
    try {
      setPhotoUrl(await uploadImageDirect(file))
      toast.success('头像已上传')
    } catch (uploadError) {
      toast.error('上传失败', { description: (uploadError as Error).message })
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      await updateAbout({ title, subtitle, content, photo_url: photoUrl })
      setSavedSnapshot(snapshot)
      toast.success('关于页已保存')
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
      <PageActions>
        {loaded && (
          <span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">
            {dirty ? '有未保存的修改' : '已保存'}
          </span>
        )}
        <Button onClick={() => void save()} disabled={!dirty || saving || uploading} size="sm">
          {saving && <Loader2 className="animate-spin" />} 保存
        </Button>
      </PageActions>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle />
          <AlertTitle>关于页加载失败</AlertTitle>
          <AlertDescription>{error}。为避免覆盖已有内容，保存已停用，请刷新页面重试。</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-4 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16 border sm:size-20">
              <AvatarImage src={photoUrl ? imageUrl(photoUrl) : undefined} alt={title || '头像'} />
              <AvatarFallback>{title.slice(0, 1).toUpperCase() || 'C'}</AvatarFallback>
            </Avatar>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadPhoto(file)
                event.target.value = ''
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {photoUrl ? '更换头像' : '上传头像'}
            </Button>
            {photoUrl && (
              <Button variant="ghost" onClick={() => setPhotoUrl(null)}><X /> 移除</Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="about-title">标题</Label>
              <Input id="about-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="about-subtitle">副标题</Label>
              <Input id="about-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="about-content">正文（Markdown）</Label>
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">编辑</TabsTrigger>
                <TabsTrigger value="preview">预览</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
                  id="about-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-[42vh] resize-y font-mono leading-relaxed"
                  placeholder="输入关于页正文…"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[42vh] rounded-md border p-4">
                  {content.trim() ? <Markdown content={content} /> : <p className="text-sm text-muted-foreground">没有内容。</p>}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
