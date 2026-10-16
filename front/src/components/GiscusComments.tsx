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
  // Production uses a commit-pinned CDN URL with CORS enabled for Giscus.
  // Local Vite assets remain available for development and previews.
  const themeBaseUrl = import.meta.env.VITE_GISCUS_THEME_BASE_URL
  const themeUrl = themeBaseUrl
    ? `${themeBaseUrl}/minimal-${theme === 'dark' ? 'dark' : 'light'}.css`
    : theme === 'dark' ? darkThemeUrl : lightThemeUrl
  const giscusTheme = new URL(
    themeUrl,
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
