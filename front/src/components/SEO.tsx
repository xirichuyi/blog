import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

const SITE = 'https://blog.chuyi.uk'
const SITE_NAME = "chuyi's blog"
const DEFAULT_DESCRIPTION = "chuyi's blog — full-stack development, technical notes, and ideas."

interface SEOProps {
  title?: string
  description?: string
  path?: string
  image?: string
  type?: 'website' | 'article'
  noIndex?: boolean
  publishedAt?: string
  modifiedAt?: string
  section?: string
  tags?: string[]
}

function absoluteUrl(value: string): string {
  if (/^https?:\/\//.test(value)) return value
  return `${SITE}${value.startsWith('/') ? value : `/${value}`}`
}

export function SEO({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image,
  type = 'website',
  noIndex = false,
  publishedAt,
  modifiedAt,
  section,
  tags = [],
}: SEOProps) {
  const canonical = absoluteUrl(path)
  const fullTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`
  const absoluteImage = image ? absoluteUrl(image) : undefined
  const jsonLd =
    type === 'article'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description,
          inLanguage: 'zh-CN',
          datePublished: publishedAt,
          dateModified: modifiedAt || publishedAt,
          articleSection: section,
          keywords: tags,
          author: { '@type': 'Person', name: 'chuyi' },
          publisher: { '@type': 'Organization', name: SITE_NAME },
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
          ...(absoluteImage ? { image: absoluteImage } : {}),
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE,
        }

  return (
    <Helmet>
      <html lang="zh-CN" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      <link rel="canonical" href={canonical} />
      <link rel="alternate" type="application/rss+xml" title={SITE_NAME} href={`${SITE}/rss.xml`} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}
      {publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {modifiedAt && <meta property="article:modified_time" content={modifiedAt} />}
      {section && <meta property="article:section" content={section} />}
      {tags.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      <script type="application/ld+json">{JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
    </Helmet>
  )
}

const STATIC_META: Record<string, { title?: string; description?: string; noIndex?: boolean }> = {
  '/': {},
  '/articles': { title: 'Archive', description: 'An archive of technical articles and notes.' },
  '/projects': { title: 'Projects', description: 'Open-source projects and self-hosted tools.' },
  '/about': { title: 'About', description: 'About chuyi.' },
  '/guestbook': { title: 'Guestbook', description: 'Notes, suggestions, questions, and links.' },
  '/books': { title: 'Books', description: 'Ebooks, reading progress, and book notes.' },
  '/changelog': { title: 'Changelog', description: 'Product updates and design changes.' },
  '/tools/gitbook2epub': {
    title: 'GitBook to EPUB',
    description: 'Convert a GitBook or bookdown site into an EPUB for offline reading.',
  },
  '/tools/quant': { title: 'Quant Performance', description: 'A read-only performance snapshot and equity curve.' },
  '/tools/mailbox': {
    title: 'Mail Reader',
    description: 'Read an IMAP inbox without storing credentials on the server.',
    noIndex: true,
  },
}

export function RouteSEO() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/article/')) return null
  const meta = STATIC_META[pathname]
  if (meta) return <SEO path={pathname} {...meta} />
  return <SEO title="Page not found" description="This page does not exist or has moved." path={pathname} noIndex />
}
