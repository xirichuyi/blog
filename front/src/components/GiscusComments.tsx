import Giscus from '@giscus/react'
import { useTheme } from '@/lib/theme'
import './GiscusComments.css'

interface GiscusCommentsProps {
  term: string
  title?: string
  description?: string
}

const GISCUS_THEME_ROOT =
  'https://cdn.jsdelivr.net/gh/xirichuyi/blog@5c113e65b4046c08d0749bea701209258160bfab'

export function GiscusComments({
  term,
  title = 'Discussion',
  description = 'Sign in with GitHub to join the conversation.',
}: GiscusCommentsProps) {
  const { theme } = useTheme()
  const themeName = theme === 'dark' ? 'dark' : 'light'
  const giscusTheme = `${GISCUS_THEME_ROOT}/giscus-minimal-${themeName}.css`

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
