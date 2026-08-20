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
  want_to_read: 'Want to read',
  reading: 'Reading',
  finished: 'Finished',
  paused: 'Paused',
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
  const [selectedEpub, setSelectedEpub] = useState<File | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const epubInputRef = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    try {
      setBooks(await adminListBooks())
    } catch (error) {
      toast.error('Could not load the bookshelf', { description: (error as Error).message })
    }
  }

  useEffect(() => { void refresh() }, [])

  const openCreate = () => {
    setForm({ ...EMPTY_BOOK })
    setSelectedEpub(null)
    setEditing('new')
  }

  const openEdit = (book: Book) => {
    setForm(payloadFromBook(book))
    setSelectedEpub(null)
    setEditing(book)
  }

  const closeEditor = () => {
    setEditing(null)
    setSelectedEpub(null)
    setUploadProgress(0)
  }

  const chooseEpub = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.epub')) {
      toast.error('Only EPUB files can be uploaded to the bookshelf')
      return
    }
    setSelectedEpub(file)
    setForm((current) => current.title.trim()
      ? current
      : { ...current, title: file.name.replace(/\.epub$/i, '') })
  }

  const save = async () => {
    if (!form.title.trim()) return
    if (editing === 'new' && !selectedEpub) {
      toast.error('Choose an EPUB file before adding the book')
      return
    }

    setBusy(true)
    let createdBookId: number | null = null
    try {
      const savedBook = editing === 'new'
        ? await createBook(form)
        : editing
          ? await updateBook(editing.id, form)
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
      toast.success(editing === 'new' ? 'Book and EPUB added' : 'Book updated')
    } catch (error) {
      if (createdBookId !== null) await deleteBook(createdBookId).catch(() => undefined)
      toast.error('Could not save the book', { description: (error as Error).message })
    } finally {
      setBusy(false)
      setUploadProgress(0)
    }
  }

  const uploadCover = async (file: File) => {
    setUploadingCover(true)
    try {
      const coverUrl = await uploadImage(file)
      setForm((current) => ({ ...current, cover_url: coverUrl }))
    } catch (error) {
      toast.error('Could not upload the cover', { description: (error as Error).message })
    } finally {
      setUploadingCover(false)
    }
  }

  const uploadFile = async (book: Book, file: File) => {
    if (!file.name.toLowerCase().endsWith('.epub')) {
      toast.error('Only EPUB files can be uploaded to the bookshelf')
      return
    }
    const controller = new AbortController()
    setUploadingBookId(book.id)
    setUploadProgress(0)
    try {
      await uploadBookFileDirect(book.id, file, (progress) => setUploadProgress(progress.percent), controller.signal)
      await refresh()
      toast.success(`${file.name} uploaded to R2`)
    } catch (error) {
      toast.error('Could not upload the EPUB', { description: (error as Error).message })
    } finally {
      setUploadingBookId(null)
      setUploadProgress(0)
    }
  }

  const removeBook = async (book: Book) => {
    if (!window.confirm(`Delete “${book.title}” and its ebook files?`)) return
    try {
      await deleteBook(book.id)
      await refresh()
      toast.success('Book deleted')
    } catch (error) {
      toast.error('Could not delete the book', { description: (error as Error).message })
    }
  }

  const removeFile = async (fileId: number) => {
    if (!window.confirm('Delete this file from R2?')) return
    try {
      await deleteBookFile(fileId)
      await refresh()
      toast.success('File deleted')
    } catch (error) {
      toast.error('Could not delete the file', { description: (error as Error).message })
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Bookshelf</h1><p className="mt-1 text-sm text-muted-foreground">Manage reading notes and EPUB files stored in R2.</p></div>
        <Button onClick={openCreate}><Plus /> Add book</Button>
      </div>

      {!books && <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="animate-spin" /> Loading…</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {books?.map((book) => (
          <Card key={book.id}>
            <CardHeader className="flex-row gap-4 space-y-0">
              <div className="grid h-24 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
                {book.cover_url ? <img src={imageUrl(book.cover_url)} alt="" className="h-full w-full object-cover" /> : <BookOpen />}
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-lg">{book.title}</CardTitle>
                <CardDescription className="mt-1">{book.author || 'Unknown author'} · {STATUS[book.reading_status]} · {book.progress}%</CardDescription>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{book.is_public ? 'Public' : 'Hidden'}</span>
                  <span>·</span>
                  <span>{book.download_enabled ? 'Downloads enabled' : 'Downloads disabled'}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(book)} aria-label="Edit"><Pencil /></Button>
              <Button variant="ghost" size="icon" onClick={() => void removeBook(book)} aria-label="Delete"><Trash2 /></Button>
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
                    {uploadingBookId === book.id ? `Uploading ${uploadProgress}%` : 'Upload EPUB'}
                    <input type="file" accept=".epub,application/epub+zip" className="hidden" disabled={uploadingBookId !== null} onChange={(event) => {
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

      <Dialog open={editing !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === 'new' ? 'Add book' : 'Edit book'}</DialogTitle><DialogDescription>Choose an EPUB and add its bookshelf details in one step.</DialogDescription></DialogHeader>
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
              <Button variant="outline" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>{uploadingCover ? <Loader2 className="animate-spin" /> : <ImagePlus />} Upload cover</Button>
              {form.cover_url && <Button variant="ghost" onClick={() => setForm((current) => ({ ...current, cover_url: null }))}><X /> Remove</Button>}
            </div>
            <div className="space-y-2">
              <Label>EPUB file {editing === 'new' && <span className="text-destructive">*</span>}</Label>
              <input ref={epubInputRef} type="file" accept=".epub,application/epub+zip" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) chooseEpub(file)
                event.target.value = ''
              }} />
              <div className="flex min-h-11 items-center gap-3 rounded-md bg-secondary/60 px-3 py-2">
                <FileUp className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {selectedEpub ? `${selectedEpub.name} · ${formatBytes(selectedEpub.size)}` : 'No EPUB selected'}
                </span>
                {selectedEpub && <Button variant="ghost" size="icon" className="size-7" onClick={() => setSelectedEpub(null)} aria-label="Remove EPUB"><X /></Button>}
                <Button type="button" variant="outline" size="sm" onClick={() => epubInputRef.current?.click()}>{selectedEpub ? 'Replace' : 'Choose EPUB'}</Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="Author"><Input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} /></Field>
              <Field label="Reading status"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.reading_status} onChange={(event) => setForm({ ...form, reading_status: event.target.value as ReadingStatus })}>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="Progress (0–100)"><Input type="number" min={0} max={100} value={form.progress} onChange={(event) => setForm({ ...form, progress: Number(event.target.value) })} /></Field>
              <Field label="Rating (1–5, optional)"><Input type="number" min={1} max={5} value={form.rating ?? ''} onChange={(event) => setForm({ ...form, rating: event.target.value ? Number(event.target.value) : null })} /></Field>
              <Field label="Started"><Input type="date" value={form.started_at ?? ''} onChange={(event) => setForm({ ...form, started_at: event.target.value || null })} /></Field>
              <Field label="Finished"><Input type="date" value={form.finished_at ?? ''} onChange={(event) => setForm({ ...form, finished_at: event.target.value || null })} /></Field>
            </div>
            <Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <Field label="Review / notes (Markdown)"><Textarea className="min-h-40 font-mono" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <div className="flex flex-wrap gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_public} onChange={(event) => setForm({ ...form, is_public: event.target.checked })} />Show on the public bookshelf</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.download_enabled} onChange={(event) => setForm({ ...form, download_enabled: event.target.checked })} />Allow public downloads</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>Cancel</Button>
            <Button disabled={busy || !form.title.trim() || (editing === 'new' && !selectedEpub)} onClick={() => void save()}>
              {busy && <Loader2 className="animate-spin" />}
              {busy && selectedEpub ? `Uploading ${uploadProgress}%` : editing === 'new' ? 'Add book' : 'Save changes'}
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
