import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown as TiptapMarkdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Code2,
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
import { BlogVideo, type BlogVideoAttributes } from '@/components/admin/BlogVideo'
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
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [mobileToolbarTop, setMobileToolbarTop] = useState(() => (
    typeof window === 'undefined' ? 0 : Math.max(0, window.innerHeight - 44)
  ))

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noreferrer', target: '_blank' },
        },
      }),
      Image.configure({
        HTMLAttributes: { loading: 'lazy', decoding: 'async' },
      }),
      BlogVideo,
      Placeholder.configure({ placeholder: '开始写作…可以直接粘贴或拖入图片' }),
      TiptapMarkdown.configure({ markedOptions: { gfm: true, breaks: false } }),
    ],
    content: value,
    contentType: 'markdown',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocapitalize: 'sentences',
        autocomplete: 'off',
        autocorrect: 'on',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => onChange(updatedEditor.getMarkdown()),
  })
  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor ? ({
      blockquote: currentEditor.isActive('blockquote'),
      bold: currentEditor.isActive('bold'),
      bulletList: currentEditor.isActive('bulletList'),
      canRedo: currentEditor.can().redo(),
      canUndo: currentEditor.can().undo(),
      code: currentEditor.isActive('code'),
      heading2: currentEditor.isActive('heading', { level: 2 }),
      heading3: currentEditor.isActive('heading', { level: 3 }),
      italic: currentEditor.isActive('italic'),
      link: currentEditor.isActive('link'),
      orderedList: currentEditor.isActive('orderedList'),
    }) : null,
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.getMarkdown() === value) return
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
  }, [editor, value])

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
    if (!editor || !file.type.startsWith('image/')) return
    setUploadError('')

    try {
      const url = await onUploadImage(file)
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '')
      editor.chain().focus().setImage({ src: url, alt }).run()
    } catch (error) {
      setUploadError((error as Error).message || '图片上传失败')
    }
  }

  const handleImagePaste = (event: React.ClipboardEvent<HTMLElement>) => {
    const file = imageFromFiles(event.clipboardData.files)
    if (!file) return
    event.preventDefault()
    void insertImage(file)
  }

  const openLinkDialog = () => {
    if (!editor) return
    setLinkValue(String(editor.getAttributes('link').href ?? ''))
    setLinkDialogOpen(true)
  }

  const applyLink = () => {
    if (!editor) return
    const nextUrl = linkValue.trim()
    if (nextUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalizeLink(nextUrl) }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setLinkDialogOpen(false)
  }

  const insertVideo = (video: BlogVideoAttributes) => {
    editor
      ?.chain()
      .focus()
      .insertContent({ type: BlogVideo.name, attrs: video })
      .run()
  }

  if (!editor) {
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border border-border text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <section
        className="admin-editor-surface"
      onPaste={handleImagePaste}
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
      onDrop={(event) => {
        const file = imageFromFiles(event.dataTransfer.files)
        if (!file) return
        event.preventDefault()
        setDragging(false)
        void insertImage(file)
      }}
    >
      <BubbleMenu editor={editor}>
        <div className="admin-editor-bubble">
          <ToolbarButton
            label="粗体"
            active={editorState?.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold />
          </ToolbarButton>
          <ToolbarButton
            label="斜体"
            active={editorState?.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic />
          </ToolbarButton>
          <ToolbarButton label="链接" active={editorState?.link} onClick={openLinkDialog}>
            <Link2 />
          </ToolbarButton>
          <ToolbarButton
            label="行内代码"
            active={editorState?.code}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code2 />
          </ToolbarButton>
        </div>
      </BubbleMenu>
      <div
        ref={toolbarRef}
        className="admin-editor-toolbar fixed inset-x-0 top-[var(--mobile-toolbar-top)] z-50 flex min-h-11 items-center gap-1 overflow-x-auto border-y border-border bg-background/95 px-1 backdrop-blur md:sticky md:inset-x-auto md:z-40 md:border-x-0"
        style={{
          '--mobile-toolbar-top': `${mobileToolbarTop}px`,
        } as CSSProperties}
      >
        <ToolbarButton
          label="二级标题"
          active={editorState?.heading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="三级标题"
          active={editorState?.heading3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton
          label="粗体 (⌘B)"
          active={editorState?.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="斜体 (⌘I)"
          active={editorState?.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="链接"
          active={editorState?.link}
          onClick={openLinkDialog}
        >
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="行内代码"
          active={editorState?.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code2 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton
          label="无序列表"
          active={editorState?.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="有序列表"
          active={editorState?.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="引用"
          active={editorState?.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="上传图片"
          disabled={uploadingImage}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        </ToolbarButton>
        <VideoUploadControl onUploaded={insertVideo} />
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

        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton
          label="撤销 (⌘Z)"
          disabled={!editorState?.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="重做 (⇧⌘Z)"
          disabled={!editorState?.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
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

      <div className="article-page admin-editor-body relative min-h-[70vh]">
        <EditorContent
          editor={editor}
          className="markdown-body wysiwyg-editor prose max-w-none px-0 pb-32 pt-8 md:pb-16"
        />
        {dragging && (
          <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-background/90 text-sm font-medium text-primary backdrop-blur">
            松开即可上传，图片会插入当前光标位置
          </div>
        )}
      </div>
      </section>
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑链接</DialogTitle>
            <DialogDescription>输入完整地址；留空保存会移除当前链接。</DialogDescription>
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
