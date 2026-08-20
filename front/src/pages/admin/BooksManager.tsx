import { useEffect, useRef, useState } from 'react'
import { BookOpen, FileUp, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  reading: '正在读',
  finished: '已读完',
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

export default function BooksManager() {
  const [books, setBooks] = useState<Book[] | null>(null)
  const [editing, setEditing] = useState<Book | 'new' | null>(null)
  const [form, setForm] = useState<BookPayload>(EMPTY_BOOK)
  const [busy, setBusy] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingBookId, setUploadingBookId] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const coverInputRef = useRef<HTMLInputElement>(null)

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
    setEditing('new')
  }

  const openEdit = (book: Book) => {
    setForm(payloadFromBook(book))
    setEditing(book)
  }

  const save = async () => {
    if (!form.title.trim()) return
    setBusy(true)
    try {
      if (editing === 'new') await createBook(form)
      else if (editing) await updateBook(editing.id, form)
      await refresh()
      setEditing(null)
      toast.success(editing === 'new' ? '书籍已添加' : '书籍已更新')
    } catch (error) {
      toast.error('保存失败', { description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const uploadCover = async (file: File) => {
    setUploadingCover(true)
    try {
      const coverUrl = await uploadImage(file)
      setForm((current) => ({ ...current, cover_url: coverUrl }))
    } catch (error) {
      toast.error('封面上传失败', { description: (error as Error).message })
    } finally {
      setUploadingCover(false)
    }
  }

  const uploadFile = async (book: Book, file: File) => {
    const controller = new AbortController()
    setUploadingBookId(book.id)
    setUploadProgress(0)
    try {
      await uploadBookFileDirect(book.id, file, (progress) => setUploadProgress(progress.percent), controller.signal)
      await refresh()
      toast.success(`${file.name} 已上传到 R2`)
    } catch (error) {
      toast.error('电子书上传失败', { description: (error as Error).message })
    } finally {
      setUploadingBookId(null)
      setUploadProgress(0)
    }
  }

  const removeBook = async (book: Book) => {
    if (!window.confirm(`确定删除《${book.title}》及其电子书文件吗？`)) return
    try {
      await deleteBook(book.id)
      await refresh()
      toast.success('书籍已删除')
    } catch (error) {
      toast.error('删除失败', { description: (error as Error).message })
    }
  }

  const removeFile = async (fileId: number) => {
    if (!window.confirm('确定从 R2 删除这个文件吗？')) return
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">书架</h1><p className="mt-1 text-sm text-muted-foreground">管理阅读状态、书评与 R2 电子书文件。</p></div>
        <Button onClick={openCreate}><Plus /> 新增书籍</Button>
      </div>

      {!books && <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="animate-spin" /> 加载中…</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {books?.map((book) => (
          <Card key={book.id}>
            <CardHeader className="flex-row gap-4 space-y-0">
              <div className="grid h-24 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
                {book.cover_url ? <img src={imageUrl(book.cover_url)} alt="" className="h-full w-full object-cover" /> : <BookOpen />}
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-lg">{book.title}</CardTitle>
                <CardDescription className="mt-1">{book.author || '未填写作者'} · {STATUS[book.reading_status]} · {book.progress}%</CardDescription>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{book.is_public ? '公开展示' : '隐藏'}</span>
                  <span>·</span>
                  <span>{book.download_enabled ? '允许下载' : '禁止下载'}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(book)} aria-label="编辑"><Pencil /></Button>
              <Button variant="ghost" size="icon" onClick={() => void removeBook(book)} aria-label="删除"><Trash2 /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {book.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
                    <span className="font-medium">{file.format.toUpperCase()}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{file.file_name} · {formatBytes(file.file_size)}</span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => void removeFile(file.id)}><X /></Button>
                  </div>
                ))}
                <Button asChild variant="outline" size="sm" className="w-full" disabled={uploadingBookId !== null}>
                  <label className="cursor-pointer">
                    {uploadingBookId === book.id ? <Loader2 className="animate-spin" /> : <FileUp />}
                    {uploadingBookId === book.id ? `上传中 ${uploadProgress}%` : '上传 PDF / EPUB / MOBI / AZW3'}
                    <input type="file" accept=".pdf,.epub,.mobi,.azw3" className="hidden" disabled={uploadingBookId !== null} onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadFile(book, file)
                      event.target.value = ''
                    }} />
                  </label>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === 'new' ? '新增书籍' : '编辑书籍'}</DialogTitle><DialogDescription>电子书文件在保存书籍后从列表上传。</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="grid h-28 w-20 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
                {form.cover_url ? <img src={imageUrl(form.cover_url)} alt="" className="h-full w-full object-cover" /> : <BookOpen />}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadCover(file)
                event.target.value = ''
              }} />
              <Button variant="outline" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>{uploadingCover ? <Loader2 className="animate-spin" /> : <ImagePlus />} 上传封面</Button>
              {form.cover_url && <Button variant="ghost" onClick={() => setForm((current) => ({ ...current, cover_url: null }))}><X /> 移除</Button>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="书名"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="作者"><Input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} /></Field>
              <Field label="阅读状态"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.reading_status} onChange={(event) => setForm({ ...form, reading_status: event.target.value as ReadingStatus })}>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="阅读进度（0–100）"><Input type="number" min={0} max={100} value={form.progress} onChange={(event) => setForm({ ...form, progress: Number(event.target.value) })} /></Field>
              <Field label="评分（1–5，可留空）"><Input type="number" min={1} max={5} value={form.rating ?? ''} onChange={(event) => setForm({ ...form, rating: event.target.value ? Number(event.target.value) : null })} /></Field>
              <Field label="开始日期"><Input type="date" value={form.started_at ?? ''} onChange={(event) => setForm({ ...form, started_at: event.target.value || null })} /></Field>
              <Field label="读完日期"><Input type="date" value={form.finished_at ?? ''} onChange={(event) => setForm({ ...form, finished_at: event.target.value || null })} /></Field>
            </div>
            <Field label="简介"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <Field label="书评 / 阅读笔记（Markdown）"><Textarea className="min-h-40 font-mono" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <div className="flex flex-wrap gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_public} onChange={(event) => setForm({ ...form, is_public: event.target.checked })} />在公开书架展示</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.download_enabled} onChange={(event) => setForm({ ...form, download_enabled: event.target.checked })} />允许公开下载</label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>取消</Button><Button disabled={busy || !form.title.trim()} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} 保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
