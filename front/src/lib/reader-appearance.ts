import { useLayoutEffect } from 'react'

// Safari paints the safe areas/overscroll from the document, not the fixed
// reader surface. Keep both in sync, and restore the blog when leaving a book.
export function useReaderAppearance(theme: 'paper' | 'night') {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-reader-theme')
    root.setAttribute('data-reader-theme', theme)
    const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const meta = existing ?? document.createElement('meta')
    const previousContent = meta.getAttribute('content')
    meta.name = 'theme-color'
    meta.content = getComputedStyle(root).getPropertyValue('--reader-paper').trim()
    if (!existing) document.head.append(meta)

    return () => {
      if (previous === null) root.removeAttribute('data-reader-theme')
      else root.setAttribute('data-reader-theme', previous)
      if (!existing) meta.remove()
      else if (previousContent === null) meta.removeAttribute('content')
      else meta.content = previousContent
    }
  }, [theme])
}
