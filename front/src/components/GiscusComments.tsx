import Giscus from '@giscus/react'
import { useTheme } from '@/lib/theme'
import lightThemeUrl from './giscus/minimal-light.css?url'
import darkThemeUrl from './giscus/minimal-dark.css?url'
import './GiscusComments.css'

interface GiscusCommentsProps {
  term: string
  title?: string
  description?: string
}

export function GiscusComments({
  term,
  title = 'Discussion',
  description = 'Sign in with GitHub to join the conversation.',
}: GiscusCommentsProps) {
  const { theme } = useTheme()
  // Giscus loads this stylesheet inside its own iframe, so use an absolute URL.
  const giscusTheme = new URL(
    theme === 'dark' ? darkThemeUrl : lightThemeUrl,
    window.location.origin,
  ).href

  return (
    <section className="giscus-comments" aria-labelledby="giscus-comments-title">
      <header className="sr-only">
        <h2 id="giscus-comments-title">{title}</h2>
        <p>{description}</p>
      </header>
      <Giscus
        id="giscus-comments-widget"
        repo="xirichuyi/blog"
        repoId="R_kgDOOja-Zg"
        category="General"
        categoryId="DIC_kwDOOja-Zs4C6WMR"
        mapping="specific"
        term={term}
        strict="0"
        reactionsEnabled="0"
        emitMetadata="0"
        inputPosition="top"
        theme={giscusTheme}
        lang="en"
        loading="lazy"
      />
    </section>
  )
}
