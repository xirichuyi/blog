import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, FileUp, Loader2, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  adminListBooks,
  createBook,
  deleteBook,
  deleteBookFile,
  updateBook,
  uploadImage,
  type BookPayload,
} from '@/services/admin'
import { uploadBookFileDirect } from '@/services/book-upload'
import { imageUrl, type Book, type ReadingStatus } from '@/services/api'

const EMPTY_BOOK: BookPayload = {
  title: '',
  author: '',
  description: '',
  cover_url: null,
  reading_status: 'want_to_read',
  progress: 0,
  rating: null,
  notes: '',
  started_at: null,
  finished_at: null,
  is_public: true,
  download_enabled: false,
}

const STATUS: Record<ReadingStatus, string> = {
  want_to_read: '想读',
  reading: '在读',
  finished: '读完',
  paused: '暂停',
}

function payloadFromBook(book: Book): BookPayload {
  return {
    title: book.title,
    author: book.author,
    description: book.description,
    cover_url: book.cover_url,
    reading_status: book.reading_status,
    progress: book.progress,
    rating: book.rating,
    notes: book.notes,
    started_at: book.started_at,
    finished_at: book.finished_at,
    is_public: book.is_public,
    download_enabled: book.download_enabled,
  }
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface EpubMetadata {
  author: string
  cover: File | null
  description: string
  title: string
}

function imageExtension(contentType: string): string {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  if (contentType === 'image/gif') return 'gif'
  return 'jpg'
}

function plainText(value: string): string {
  return new DOMParser().parseFromString(value, 'text/html').body.textContent?.trim() ?? ''
}

async function readEpubMetadata(file: File): Promise<EpubMetadata> {
  const { default: createEpub } = await import('epubjs')
  const epub = createEpub(await file.arrayBuffer())
  try {
    const [metadata, coverUrl] = await Promise.all([epub.loaded.metadata, epub.coverUrl()])
    let cover: File | null = null
    if (coverUrl) {
      const blob = await fetch(coverUrl).then((response) => response.blob())
      if (blob.type.startsWith('image/')) {
        const name = `${file.name.replace(/\.epub$/i, '')}-cover.${imageExtension(blob.type)}`
        cover = new File([blob], name, { type: blob.type })
      }
    }
    return {
      author: metadata.creator?.trim() ?? '',
      cover,
      description: plainText(metadata.description ?? ''),
      title: metadata.title?.trim() ?? '',
    }
  } finally {
    epub.destroy()
  }
}

export default function BooksManager() {
  const [books, setBooks] = useState<Book[] | null>(null)
  const [editing, setEditing] = useState<Book | 'new' | null>(null)
  const [form, setForm] = useState<BookPayload>(EMPTY_BOOK)
  const [busy, setBusy] = useState(false)
  const [readingEpub, setReadingEpub] = useState(false)
  const [uploadingBookId, setUploadingBookId] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedEpub, setSelectedEpub] = useState<File | null>(null)
  const [embeddedCover, setEmbeddedCover] = useState<File | null>(null)
  const epubInputRef = useRef<HTMLInputElement>(null)
  const embeddedCoverUrl = useMemo(
    () => embeddedCover ? URL.createObjectURL(embeddedCover) : null,
    [embeddedCover],
  )

  useEffect(() => () => {
    if (embeddedCoverUrl) URL.revokeObjectURL(embeddedCoverUrl)
  }, [embeddedCoverUrl])

  const refresh = async () => {
    try {
      setBooks(await adminListBooks())
    } catch (error) {
      toast.error('书架加载失败', { description: (error as Error).message })
    }
  }

  useEffect(() => { void refresh() }, [])

  const openCreate = () => {
    setForm({ ...EMPTY_BOOK })
    setSelectedEpub(null)
    setEmbeddedCover(null)
    setEditing('new')
  }

  const openEdit = (book: Book) => {
    setForm(payloadFromBook(book))
    setSelectedEpub(null)
    setEmbeddedCover(null)
    setEditing(book)
  }

  const closeEditor = () => {
    setEditing(null)
    setSelectedEpub(null)
    setEmbeddedCover(null)
    setUploadProgress(0)
  }

  const chooseEpub = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.epub')) {
      toast.error('只能上传 EPUB 文件')
      return
    }
    setSelectedEpub(file)
    setReadingEpub(true)
    try {
      const metadata = await readEpubMetadata(file)
      setEmbeddedCover(metadata.cover)
      setForm((current) => ({
        ...current,
        author: current.author.trim() || metadata.author,
        description: current.description.trim() || metadata.description,
        title: current.title.trim() || metadata.title || file.name.replace(/\.epub$/i, ''),
      }))
    } catch (error) {
      setEmbeddedCover(null)
      setForm((current) => current.title.trim()
        ? current
        : { ...current, title: file.name.replace(/\.epub$/i, '') })
      toast.warning('已选择 EPUB，但无法读取书籍信息', {
        description: (error as Error).message,
      })
    } finally {
      setReadingEpub(false)
    }
  }

  const save = async () => {
    if (!form.title.trim()) return
    if (editing === 'new' && !selectedEpub) {
      toast.error('请先选择 EPUB 文件')
      return
    }

    setBusy(true)
    let createdBookId: number | null = null
    try {
      const coverUrl = embeddedCover ? await uploadImage(embeddedCover) : form.cover_url
      const payload = { ...form, cover_url: coverUrl }
      const savedBook = editing === 'new'
        ? await createBook(payload)
        : editing
          ? await updateBook(editing.id, payload)
          : null

      if (!savedBook) return
      if (editing === 'new') createdBookId = savedBook.id

      if (selectedEpub) {
        const controller = new AbortController()
        setUploadProgress(0)
        await uploadBookFileDirect(
          savedBook.id,
          selectedEpub,
          (progress) => setUploadProgress(progress.percent),
          controller.signal,
        )
      }

      await refresh()
      closeEditor()
      toast.success(editing === 'new' ? '书籍已添加' : '书籍已更新')
    } catch (error) {
      if (createdBookId !== null) await deleteBook(createdBookId).catch(() => undefined)
      toast.error('书籍保存失败', { description: (error as Error).message })
    } finally {
      setBusy(false)
      setUploadProgress(0)
    }
  }

  const uploadFile = async (book: Book, file: File) => {
    if (!file.name.toLowerCase().endsWith('.epub')) {
      toast.error('只能上传 EPUB 文件')
      return
    }
    const controller = new AbortController()
    setUploadingBookId(book.id)
    setUploadProgress(0)
    try {
      await uploadBookFileDirect(book.id, file, (progress) => setUploadProgress(progress.percent), controller.signal)
      await refresh()
      toast.success(`${file.name} 已上传`)
    } catch (error) {
      toast.error('EPUB 上传失败', { description: (error as Error).message })
    } finally {
      setUploadingBookId(null)
      setUploadProgress(0)
    }
  }

  const removeBook = async (book: Book) => {
    if (!window.confirm(`确定删除“${book.title}”及其电子书文件吗？`)) return
    try {
      await deleteBook(book.id)
      await refresh()
      toast.success('书籍已删除')
    } catch (error) {
      toast.error('书籍删除失败', { description: (error as Error).message })
    }
  }

  const removeFile = async (fileId: number) => {
    if (!window.confirm('确定删除这个文件吗？')) return
    try {
      await deleteBookFile(fileId)
      await refresh()
      toast.success('文件已删除')
    } catch (error) {
      toast.error('文件删除失败', { description: (error as Error).message })
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate} size="sm"><Plus /> 添加书籍</Button>
      </div>

      {!books && <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="animate-spin" /> 加载中…</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {books?.map((book) => (
          <Card key={book.id}>
            <CardHeader className="flex-row gap-3 space-y-0 p-4">
              <div className="grid h-20 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
                {book.cover_url ? <img src={imageUrl(book.cover_url)} alt="" className="h-full w-full object-cover" /> : <BookOpen />}
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-lg">{book.title}</CardTitle>
                <CardDescription className="mt-1">{book.author || '未知作者'} · {STATUS[book.reading_status]} · {book.progress}%</CardDescription>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{book.is_public ? '公开' : '隐藏'}</span>
                  <span>·</span>
                  <span>{book.download_enabled ? '允许下载' : '禁止下载'}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`操作：${book.title}`}><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openEdit(book)}><Pencil /> 编辑</DropdownMenuItem>
                  <DropdownMenuItem asChild disabled={uploadingBookId !== null}>
                    <label className="cursor-pointer">
                      <FileUp /> {uploadingBookId === book.id ? `上传中 ${uploadProgress}%` : '上传 EPUB'}
                      <input type="file" accept=".epub,application/epub+zip" className="hidden" disabled={uploadingBookId !== null} onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void uploadFile(book, file)
                        event.target.value = ''
                      }} />
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void removeBook(book)}><Trash2 /> 删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {book.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
                    <span className="font-medium">{file.format.toUpperCase()}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{file.file_name} · {formatBytes(file.file_size)}</span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => void removeFile(file.id)}><X /></Button>
                  </div>
                ))}
                {book.files.length === 0 && (
                  <p className="py-2 text-xs text-muted-foreground">暂无电子书文件，可从右上角菜单上传。</p>
                )}
                {uploadingBookId === book.id && (
                  <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> 上传中 {uploadProgress}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {books?.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
            书架还是空的。
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === 'new' ? '添加书籍' : '编辑书籍'}</DialogTitle><DialogDescription>选择 EPUB 后会自动读取标题、作者和封面。</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="grid h-28 w-20 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
                {embeddedCoverUrl || form.cover_url
                  ? <img src={embeddedCoverUrl || imageUrl(form.cover_url ?? undefined)} alt="" className="h-full w-full object-cover" />
                  : <BookOpen />}
              </div>
              <div>
                <p className="text-sm font-medium">书籍封面</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">优先使用 EPUB 内嵌封面。</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>EPUB 文件 {editing === 'new' && <span className="text-destructive">*</span>}</Label>
              <input ref={epubInputRef} type="file" accept=".epub,application/epub+zip" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void chooseEpub(file)
                event.target.value = ''
              }} />
              <div className="flex min-h-11 items-center gap-3 rounded-md bg-secondary/60 px-3 py-2">
                {readingEpub ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : <FileUp className="size-4 shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {readingEpub ? '正在读取书籍信息…' : selectedEpub ? `${selectedEpub.name} · ${formatBytes(selectedEpub.size)}` : '未选择 EPUB'}
                </span>
                {selectedEpub && <Button variant="ghost" size="icon" className="size-7" onClick={() => setSelectedEpub(null)} aria-label="移除 EPUB"><X /></Button>}
                <Button type="button" variant="outline" size="sm" onClick={() => epubInputRef.current?.click()}>{selectedEpub ? '更换' : '选择 EPUB'}</Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="书名"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="作者"><Input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} /></Field>
              <Field label="阅读状态"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.reading_status} onChange={(event) => setForm({ ...form, reading_status: event.target.value as ReadingStatus })}>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="进度（0–100）"><Input type="number" min={0} max={100} value={form.progress} onChange={(event) => setForm({ ...form, progress: Number(event.target.value) })} /></Field>
            </div>
            <div className="flex flex-wrap gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_public} onChange={(event) => setForm({ ...form, is_public: event.target.checked })} />显示在公开书架</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.download_enabled} onChange={(event) => setForm({ ...form, download_enabled: event.target.checked })} />允许公开下载</label>
            </div>
            <details className="group rounded-lg border">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden">
                更多信息
                <span className="float-right text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-4 border-t p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="评分（1–5）"><Input type="number" min={1} max={5} value={form.rating ?? ''} onChange={(event) => setForm({ ...form, rating: event.target.value ? Number(event.target.value) : null })} /></Field>
                  <Field label="开始日期"><Input type="date" value={form.started_at ?? ''} onChange={(event) => setForm({ ...form, started_at: event.target.value || null })} /></Field>
                  <Field label="完成日期"><Input type="date" value={form.finished_at ?? ''} onChange={(event) => setForm({ ...form, finished_at: event.target.value || null })} /></Field>
                </div>
                <Field label="简介"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
                <Field label="书评 / 笔记（Markdown）"><Textarea className="min-h-40 font-mono" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>取消</Button>
            <Button disabled={busy || readingEpub || !form.title.trim() || (editing === 'new' && !selectedEpub)} onClick={() => void save()}>
              {busy && <Loader2 className="animate-spin" />}
              {busy && selectedEpub ? `上传中 ${uploadProgress}%` : editing === 'new' ? '添加书籍' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
