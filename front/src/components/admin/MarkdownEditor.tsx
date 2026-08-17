import { useEffect, useRef, useState, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
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
  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')

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
      Placeholder.configure({ placeholder: '开始写作…可以直接粘贴或拖入图片' }),
      TiptapMarkdown.configure({ markedOptions: { gfm: true, breaks: false } }),
    ],
    content: value,
    contentType: 'markdown',
    immediatelyRender: false,
    onUpdate: ({ editor: updatedEditor }) => onChange(updatedEditor.getMarkdown()),
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.getMarkdown() === value) return
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
  }, [editor, value])

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
        className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
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
      <div className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-border px-2">
        <ToolbarButton
          label="二级标题"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="三级标题"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton
          label="粗体 (⌘B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="斜体 (⌘I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="链接"
          active={editor.isActive('link')}
          onClick={openLinkDialog}
        >
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="行内代码"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code2 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton
          label="无序列表"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="有序列表"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="引用"
          active={editor.isActive('blockquote')}
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
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="重做 (⇧⌘Z)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </ToolbarButton>
        <span className="ml-auto shrink-0 pl-2 text-xs tabular-nums text-muted-foreground">
          {value.length.toLocaleString()} 字符
        </span>
      </div>

      {uploadError && (
        <p className="border-b border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {uploadError}
        </p>
      )}

      <div className="article-page relative max-h-[70vh] min-h-[32rem] overflow-y-auto bg-muted/10 lg:max-h-[calc(100dvh-16rem)] lg:min-h-[38rem]">
        <EditorContent
          editor={editor}
          className="markdown-body wysiwyg-editor prose mx-auto max-w-3xl px-5 py-7 sm:px-8 lg:px-12 lg:py-10"
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
