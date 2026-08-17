import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Markdown } from '@/components/Markdown'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getAboutRaw, updateAbout, uploadImage } from '@/services/admin'
import { imageUrl } from '@/services/api'

export default function AboutEditor() {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAboutRaw()
      .then((about) => {
        setTitle(about.title || '')
        setSubtitle(about.subtitle || '')
        setContent(about.content || '')
        setPhotoUrl((about as { photo_url?: string }).photo_url ?? null)
      })
      .catch((loadError) => setError(String(loadError.message || loadError)))
      .finally(() => setLoading(false))
  }, [])

  async function uploadPhoto(file: File) {
    setUploading(true)
    try {
      setPhotoUrl(await uploadImage(file))
      toast.success('头像已上传')
    } catch (uploadError) {
      toast.error('上传失败', { description: (uploadError as Error).message })
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await updateAbout({ title, subtitle, content, photo_url: photoUrl })
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
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">关于页</h1>
          <p className="mt-1 text-sm text-muted-foreground">维护个人简介与头像。</p>
        </div>
        <Button onClick={() => void save()} disabled={saving} size="sm">
          {saving && <Loader2 className="animate-spin" />} 保存
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle />
          <AlertTitle>关于页加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>这些内容会显示在公开的关于页面。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-20 border">
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
            <Label>正文（Markdown）</Label>
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">编辑</TabsTrigger>
                <TabsTrigger value="preview">预览</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
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
