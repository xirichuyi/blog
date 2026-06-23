import { useEffect, useRef, useState } from 'react'
import { Loader2, Check, ImagePlus } from 'lucide-react'
import { getAboutRaw, updateAbout, uploadImage } from '@/services/admin'
import { imageUrl } from '@/services/api'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function AboutEditor() {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAboutRaw()
      .then((a) => {
        setTitle(a.title || '')
        setSubtitle(a.subtitle || '')
        setContent(a.content || '')
        setPhotoUrl((a as { photo_url?: string }).photo_url ?? null)
      })
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false))
  }, [])

  async function onPhoto(file: File) {
    setUploading(true)
    setErr('')
    try {
      setPhotoUrl(await uploadImage(file))
    } catch (e) {
      setErr('上传失败：' + (e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true)
    setErr('')
    setSaved(false)
    try {
      await updateAbout({ title, subtitle, content, photo_url: photoUrl })
      setSaved(true)
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">关于页</h1>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-500">
              <Check className="size-4" /> 已保存
            </span>
          )}
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? <Loader2 className="size-4 animate-spin" /> : '保存'}
          </Button>
        </div>
      </div>

      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}

      <div className="mb-4 flex items-center gap-3">
        {photoUrl && <img src={imageUrl(photoUrl)} alt="" className="size-16 rounded-full object-cover" />}
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          头像
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
          />
        </label>
        {photoUrl && (
          <button onClick={() => setPhotoUrl(null)} className="text-sm text-muted-foreground hover:text-destructive">
            移除
          </button>
        )}
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">标题</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">副标题</label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
      </div>

      <label className="mb-1 block text-xs text-muted-foreground">正文（Markdown）</label>
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
      </div>
      {tab === 'write' ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[40vh] w-full resize-y rounded-lg border border-border bg-background p-4 font-mono text-sm leading-relaxed outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <div className="min-h-[40vh] rounded-lg border border-border p-4">
          {content.trim() ? <Markdown content={content} /> : <p className="text-sm text-muted-foreground">没有内容。</p>}
        </div>
      )}
    </div>
  )
}
