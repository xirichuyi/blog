import { Loader2 } from 'lucide-react'
import { BookCoverImage } from './BookCoverImage'

export function ReaderLoading({ title, cover, message }: { title: string; cover?: string; message: string }) {
  return <div className="reader-state" role="status" aria-live="polite">
    <div className="h-36 w-24 overflow-hidden rounded bg-[#526a5e] shadow-md">
      <BookCoverImage src={cover} title={title} />
    </div>
    <strong>{title}</strong>
    <span className="flex items-center gap-2"><Loader2 className="animate-spin motion-reduce:animate-none" />{message}</span>
  </div>
}
