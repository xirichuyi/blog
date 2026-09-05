import { useDeferredValue, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useMarkdownSource } from './useMarkdownSource'
import { Markdown } from '@/components/Markdown'
import { serializeGallery } from '@/lib/blog-gallery'
import {
  Bold,
  Code2,
  GalleryHorizontal,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { serializeVideo, type BlogVideoAttributes } from '@/lib/blog-video'
import { VideoUploadControl } from '@/components/admin/VideoUploadControl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onUploadImage: (file: File) => Promise<string>
  uploadingImage: boolean
}

interface ToolbarButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function imageFromFiles(files: FileList | null): File | null {
  return Array.from(files ?? []).find((file) => file.type.startsWith('image/')) ?? null
}

function imagesFromFiles(files: FileList | null): File[] {
  return Array.from(files ?? []).filter((file) => file.type.startsWith('image/'))
}

function hasImageFile(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.items).some(
    (item) => item.kind === 'file' && item.type.startsWith('image/'),
  )
}

function normalizeLink(url: string): string {
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(url)) return url
  return `https://${url}`
}

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          className="shrink-0"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function MarkdownEditor({
  value,
  onChange,
  onUploadImage,
  uploadingImage,
}: MarkdownEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [mobileToolbarTop, setMobileToolbarTop] = useState(() => (
    typeof window === 'undefined' ? 0 : Math.max(0, window.innerHeight - 44)
  ))

  const editor = useMarkdownSource(value, onChange)
  const [mode, setMode] = useState<'source' | 'split' | 'preview'>('source')
  const previewValue = useDeferredValue(value)
  const videoAnchorRef = useRef<((text?: string) => void) | null>(null)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let frame = 0
    let settleTimer = 0
    const updateToolbarPosition = () => {
      const toolbarHeight = toolbarRef.current?.getBoundingClientRect().height || 44
      const visibleBottom = viewport.offsetTop + viewport.height
      setMobileToolbarTop(Math.max(0, Math.round(visibleBottom - toolbarHeight)))
    }
    const scheduleToolbarPosition = () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      frame = requestAnimationFrame(updateToolbarPosition)
      settleTimer = window.setTimeout(updateToolbarPosition, 350)
    }

    scheduleToolbarPosition()
    viewport.addEventListener('resize', scheduleToolbarPosition)
    viewport.addEventListener('scroll', scheduleToolbarPosition)
    window.addEventListener('resize', scheduleToolbarPosition)
    window.addEventListener('scroll', scheduleToolbarPosition, { passive: true })
    document.addEventListener('focusin', scheduleToolbarPosition)
    document.addEventListener('focusout', scheduleToolbarPosition)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      viewport.removeEventListener('resize', scheduleToolbarPosition)
      viewport.removeEventListener('scroll', scheduleToolbarPosition)
      window.removeEventListener('resize', scheduleToolbarPosition)
      window.removeEventListener('scroll', scheduleToolbarPosition)
      document.removeEventListener('focusin', scheduleToolbarPosition)
      document.removeEventListener('focusout', scheduleToolbarPosition)
    }
  }, [])

  const insertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const finish = editor.anchor()
    setUploadError('')

    try {
      const url = await onUploadImage(file)
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '')
      finish(`![${alt}](<${url.replace(/>/g, '%3E')}>)`)
    } catch (error) {
      finish()
      setUploadError((error as Error).message || '图片上传失败')
    }
  }

  const insertGallery = async (files: File[]) => {
    const selectedImages = files.filter((file) => file.type.startsWith('image/'))
    const images = selectedImages.slice(0, 12)
    if (images.length < 2) {
      setUploadError('图片组至少需要选择 2 张图片。')
      return
    }

    setUploadError('')
    setUploadingGallery(true)
    const finish = editor.anchor()
    try {
      const uploads = await Promise.allSettled(images.map(async (file) => ({
        src: await onUploadImage(file),
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[\[\]]/g, ''),
      })))
      const items = uploads.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
      if (items.length < 2) throw new Error('成功上传的图片不足 2 张，请重新选择。')
      finish(serializeGallery(items))
      const failedCount = uploads.length - items.length
      const skippedCount = selectedImages.length - images.length
      const notices = [
        failedCount > 0 ? `${failedCount} 张上传失败` : '',
        skippedCount > 0 ? `${skippedCount} 张超过单组 12 张的上限` : '',
      ].filter(Boolean)
      if (notices.length > 0) setUploadError(`${notices.join('，')}；其余图片已组成图片组。`)
    } catch (error) {
      setUploadError((error as Error).message || '图片组上传失败')
    } finally {
      finish()
      setUploadingGallery(false)
    }
  }

  const handleImagePaste = (event: React.ClipboardEvent<HTMLElement>) => {
    const files = imagesFromFiles(event.clipboardData.files)
    if (files.length === 0) return
    event.preventDefault()
    if (files.length >= 2) void insertGallery(files)
    else void insertImage(files[0])
  }

  const openLinkDialog = () => {
    setLinkValue('')
    setLinkDialogOpen(true)
  }

  const applyLink = () => {
    const nextUrl = linkValue.trim()
    if (nextUrl) editor.wrap('[', `](<${normalizeLink(nextUrl).replace(/>/g, '%3E')}>)`, '链接文字')
    setLinkDialogOpen(false)
  }

  const insertVideo = (video: BlogVideoAttributes) => {
    const finish = videoAnchorRef.current
    if (finish) finish(serializeVideo(video))
    else editor.insert(`\n\n${serializeVideo(video)}\n\n`)
    videoAnchorRef.current = null
  }

  return (
    <TooltipProvider delayDuration={300}>
      <section
        className="admin-editor-surface"
      onPasteCapture={handleImagePaste}
      onDragEnter={(event) => {
        if (!hasImageFile(event.dataTransfer)) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => {
        if (hasImageFile(event.dataTransfer)) event.preventDefault()
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDropCapture={(event) => {
        const files = imagesFromFiles(event.dataTransfer.files)
        if (files.length === 0) return
        event.preventDefault()
        setDragging(false)
        if (files.length >= 2) void insertGallery(files)
        else void insertImage(files[0])
      }}
    >
      <div
        ref={toolbarRef}
        className="admin-editor-toolbar fixed inset-x-0 top-[var(--mobile-toolbar-top)] z-50 flex min-h-11 items-center gap-1 overflow-x-auto border-y border-border bg-background/95 px-1 backdrop-blur md:sticky md:inset-x-auto md:z-40 md:border-x-0"
        style={{
          display: mode === 'preview' ? 'none' : undefined,
          '--mobile-toolbar-top': `${mobileToolbarTop}px`,
        } as CSSProperties}
      >
        <ToolbarButton
          label="二级标题"
          onClick={() => editor.prefix('## ')}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="三级标题"
          onClick={() => editor.prefix('### ')}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton
          label="粗体 (⌘B)"
          onClick={() => editor.wrap('**')}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="斜体 (⌘I)"
          onClick={() => editor.wrap('*')}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="链接"
          onClick={openLinkDialog}
        >
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="行内代码"
          onClick={() => editor.wrap('`')}
        >
          <Code2 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton
          label="无序列表"
          onClick={() => editor.prefix('- ')}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="有序列表"
          onClick={() => editor.prefix('1. ')}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="引用"
          onClick={() => editor.prefix('> ')}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="上传图片"
          disabled={uploadingImage || uploadingGallery}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        </ToolbarButton>
        <ToolbarButton
          label="插入图片组"
          disabled={uploadingImage || uploadingGallery}
          onClick={() => galleryInputRef.current?.click()}
        >
          {uploadingGallery ? <Loader2 className="size-4 animate-spin" /> : <GalleryHorizontal className="size-4" />}
        </ToolbarButton>
        <VideoUploadControl onUploaded={insertVideo} onUploadStart={() => {
          videoAnchorRef.current?.()
          videoAnchorRef.current = editor.anchor()
        }} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = imageFromFiles(event.target.files)
            if (file) void insertImage(file)
            event.target.value = ''
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = imagesFromFiles(event.target.files)
            if (files.length > 0) void insertGallery(files)
            event.target.value = ''
          }}
        />

        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton
          label="撤销 (⌘Z)"
          disabled={!editor.canUndo}
          onClick={() => editor.undo()}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="重做 (⇧⌘Z)"
          disabled={!editor.canRedo}
          onClick={() => editor.redo()}
        >
          <Redo2 className="size-4" />
        </ToolbarButton>
        <span className="ml-auto hidden shrink-0 pl-2 text-xs tabular-nums text-muted-foreground sm:inline">
          {value.length.toLocaleString()} 字符
        </span>
      </div>

      {uploadError && (
        <p className="border-b border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {uploadError}
        </p>
      )}

      <div className="flex gap-1 border-b border-border py-2" role="group" aria-label="编辑视图">
        {(['source', 'split', 'preview'] as const).map((item) => (
          <Button key={item} type="button" size="sm" variant={mode === item ? 'secondary' : 'ghost'}
            aria-pressed={mode === item} onClick={() => setMode(item)}>
            {{ source: '源码', split: '分屏', preview: '预览' }[item]}
          </Button>
        ))}
      </div>
      <div className={`article-page admin-editor-body relative min-h-[70vh] ${mode === 'split' ? 'grid gap-6 md:grid-cols-2' : ''}`}>
        <div ref={editor.hostRef} hidden={mode === 'preview'}
          className="min-w-0 px-0 pb-32 pt-8 text-base md:pb-16" />
        {mode !== 'source' && (
          <div className="min-w-0 pb-32 pt-8 md:pb-16" aria-label="文章预览" aria-busy={previewValue !== value}>
            <Markdown content={previewValue} enableLightbox={false} />
          </div>
        )}
        {dragging && (
          <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-background/90 text-sm font-medium text-primary backdrop-blur">
            松开即可上传，图片会插入上传开始时的光标位置
          </div>
        )}
      </div>
      </section>
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑链接</DialogTitle>
            <DialogDescription>输入地址，将选中文字转换为 Markdown 链接。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="editor-link">链接地址</Label>
            <Input
              id="editor-link"
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyLink()
                }
              }}
              placeholder="https://example.com"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>取消</Button>
            <Button onClick={applyLink}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
