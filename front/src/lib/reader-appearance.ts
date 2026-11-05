import { useLayoutEffect } from 'react'
import { syncDocumentTheme } from '@/lib/document-theme'

// Safari paints the safe areas/overscroll from the document, not the fixed
// reader surface. Keep both in sync, and restore the blog when leaving a book.
export function useReaderAppearance(theme: 'paper' | 'night') {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-reader-theme')
    root.setAttribute('data-reader-theme', theme)
    syncDocumentTheme()

    return () => {
      if (previous === null) root.removeAttribute('data-reader-theme')
      else root.setAttribute('data-reader-theme', previous)
      syncDocumentTheme()
    }
  }, [theme])
}
