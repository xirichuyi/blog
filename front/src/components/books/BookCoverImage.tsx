import { useState } from 'react'
import { BookOpen } from 'lucide-react'

// A cover is an independent image, never a render of the EPUB/PDF itself.
export function BookCoverImage({ src, title, lazy = false }: { src?: string; title: string; lazy?: boolean }) {
  const [loadedSrc, setLoadedSrc] = useState<string>()
  const [failedSrc, setFailedSrc] = useState<string>()
  const loaded = Boolean(src && loadedSrc === src)
  return (
    <span className="relative block h-full w-full overflow-hidden rounded-[inherit]">
      {!loaded && <span className="absolute inset-0 flex flex-col p-3 text-white/80" aria-label={`${title}封面`}>
        <BookOpen className="mb-auto size-4" aria-hidden="true" />
        <strong className="overflow-hidden text-[10px] font-semibold leading-snug">{title}</strong>
      </span>}
      {src && failedSrc !== src && <img src={src} alt={`${title}封面`} loading={lazy ? 'lazy' : 'eager'} decoding="async"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoadedSrc(src)} onError={() => { setLoadedSrc(undefined); setFailedSrc(src) }} />}
    </span>
  )
}
