import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c'
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go'
import graphql from 'react-syntax-highlighter/dist/esm/languages/prism/graphql'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php'
import powershell from 'react-syntax-highlighter/dist/esm/languages/prism/powershell'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby'
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust'
import shellSession from 'react-syntax-highlighter/dist/esm/languages/prism/shell-session'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Link2 } from 'lucide-react'
import {
  decodeGalleryItems,
  encodeGalleryItems,
  GALLERY_ALT_PREFIX,
  replaceGalleryDirectives,
  type BlogGalleryItem,
} from '@/lib/blog-gallery'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const VIDEO_ALT_PREFIX = 'BLOGVIDEO:'
const VIDEO_TAG_PATTERN = /<video\s+[^>]*data-blog-video="true"[^>]*><\/video>/gi
const VIDEO_DIRECTIVE_PATTERN = /:::video(?:\s+\{([^}\r\n]*)\})?\s*:::/gi

for (const [name, language] of Object.entries({
  bash,
  c,
  csharp,
  css,
  go,
  graphql,
  javascript,
  jsx,
  json,
  markdown,
  php,
  powershell,
  python,
  ruby,
  rust,
  'shell-session': shellSession,
  sql,
  toml,
  tsx,
  typescript,
  yaml,
})) {
  SyntaxHighlighter.registerLanguage(name, language)
}
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('shell', bash)
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('ts', typescript)
SyntaxHighlighter.registerLanguage('cs', csharp)
SyntaxHighlighter.registerLanguage('md', markdown)
SyntaxHighlighter.registerLanguage('yml', yaml)

const CodeBlock = memo(function CodeBlock({
  language,
  text,
  style,
}: {
  language: string
  text: string
  style: Record<string, CSSProperties>
}) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    },
    [],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="md-code-block not-prose group/code">
      <div className="md-code-toolbar">
        <span className="md-code-language">{language || 'text'}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Code copied' : 'Copy code'}
          className={cn('md-code-copy', copied && 'copied')}
        >
          <span aria-hidden="true">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={style}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1.25rem 1.35rem 1.4rem',
          background: 'transparent',
          fontSize: 13,
          lineHeight: 1.75,
        }}
        codeTagProps={{
          className: 'md-code-source',
          style: { fontFamily: 'var(--font-code)' },
        }}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  )
})

interface AnchoredHeadingProps extends ComponentPropsWithoutRef<'h2'> {
  level: 2 | 3
}

const AnchoredHeading = memo(function AnchoredHeading({
  level,
  id,
  children,
  ...props
}: AnchoredHeadingProps) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<number | null>(null)
  const Heading = level === 2 ? 'h2' : 'h3'

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    },
    [],
  )

  const copyHeadingLink = async () => {
    if (!id) return
    try {
      await navigator.clipboard.writeText(`${window.location.href.split('#')[0]}#${id}`)
      setCopied(true)
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      // The heading link still works when clipboard access is unavailable.
    }
  }

  return (
    <Heading id={id} {...props} className={cn('md-heading', props.className)}>
      <span className="md-heading-content">{children}</span>
      <a
        href={id ? `#${id}` : undefined}
        className="md-heading-anchor"
        onClick={copyHeadingLink}
        aria-label={copied ? 'Link copied' : 'Copy heading link'}
      >
        <span aria-hidden="true">
          {copied ? <Check /> : <Link2 />}
        </span>
      </a>
    </Heading>
  )
})

interface MarkdownImageProps extends ComponentPropsWithoutRef<'img'> {
  interactive?: boolean
}

const MarkdownImage = memo(function MarkdownImage({
  src,
  alt = '',
  onLoad,
  onError,
  interactive = true,
  ...props
}: MarkdownImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const imageHref = typeof src === 'string' ? src : undefined

  return (
    <span className="md-figure">
      <a
        href={imageHref}
        target={interactive ? '_blank' : undefined}
        rel={interactive ? 'noreferrer' : undefined}
        className={cn('md-image-frame', loaded && 'is-loaded', !interactive && 'is-static')}
        data-pswp-width={size.width || undefined}
        data-pswp-height={size.height || undefined}
        data-cropped="true"
        data-zoomable={interactive ? 'true' : undefined}
        aria-label={interactive ? (alt ? `View full-size image: ${alt}` : 'View full-size image') : undefined}
        tabIndex={interactive ? undefined : -1}
        onClick={interactive ? undefined : (event) => event.preventDefault()}
      >
        <img
          src={imageHref}
          alt={alt}
          loading="lazy"
          decoding="async"
          data-loaded={loaded ? 'true' : undefined}
          onLoad={(event) => {
            setLoaded(true)
            setSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
            onLoad?.(event)
          }}
          onError={(event) => {
            setLoaded(true)
            onError?.(event)
          }}
          {...props}
        />
      </a>
      {alt && <span className="md-figcaption">{alt}</span>}
    </span>
  )
})

const MarkdownVideo = memo(function MarkdownVideo({
  src,
  title,
}: ComponentPropsWithoutRef<'video'>) {
  const videoSource = typeof src === 'string' ? src : undefined
  return (
    <figure className="md-video-figure not-prose">
      <video
        src={videoSource}
        title={title}
        controls
        playsInline
        preload="metadata"
      />
      <figcaption>
        <span>{title || 'Video'}</span>
        <a href={videoSource} target="_blank" rel="noreferrer">Open original</a>
      </figcaption>
    </figure>
  )
})

const GalleryImage = memo(function GalleryImage({
  item,
  interactive,
}: {
  item: BlogGalleryItem
  interactive: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const [size, setSize] = useState({ width: 0, height: 0 })

  return (
    <figure className="md-gallery-item">
      <a
        href={item.src}
        target={interactive ? '_blank' : undefined}
        rel={interactive ? 'noreferrer' : undefined}
        className={cn('md-gallery-image', loaded && 'is-loaded', !interactive && 'is-static')}
        data-pswp-width={size.width || undefined}
        data-pswp-height={size.height || undefined}
        data-cropped="true"
        data-zoomable={interactive ? 'true' : undefined}
        aria-label={interactive ? (item.alt ? `查看大图：${item.alt}` : '查看大图') : undefined}
        tabIndex={interactive ? undefined : -1}
        onClick={interactive ? undefined : (event) => event.preventDefault()}
      >
        <img
          src={item.src}
          alt={item.alt ?? ''}
          loading="lazy"
          decoding="async"
          onLoad={(event) => {
            setLoaded(true)
            setSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }}
          onError={() => setLoaded(true)}
        />
      </a>
      {item.alt && <figcaption className="md-gallery-caption">{item.alt}</figcaption>}
    </figure>
  )
})

const MarkdownGallery = memo(function MarkdownGallery({
  items,
  interactive,
}: {
  items: BlogGalleryItem[]
  interactive: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null)
  const suppressClickRef = useRef(false)
  const [active, setActive] = useState(0)

  const updateActive = () => {
    const track = trackRef.current
    if (!track) return
    const center = track.scrollLeft + track.clientWidth / 2
    const slides = Array.from(track.querySelectorAll<HTMLElement>('.md-gallery-item'))
    let nearest = 0
    let distance = Number.POSITIVE_INFINITY
    slides.forEach((slide, index) => {
      const nextDistance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center)
      if (nextDistance < distance) {
        distance = nextDistance
        nearest = index
      }
    })
    setActive(nearest)
  }

  const goTo = (index: number) => {
    const track = trackRef.current
    const slide = track?.querySelectorAll<HTMLElement>('.md-gallery-item')[index]
    if (!track || !slide) return
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
    setActive(index)
  }

  return (
    <section className="md-gallery not-prose" aria-label={`${items.length} 张图片组成的图片组`}>
      <div className="md-gallery-meta">
        <span>影像 · {String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
        <span className="md-gallery-rule" />
        <div className="md-gallery-controls">
          <button type="button" onClick={() => goTo(Math.max(0, active - 1))} disabled={active === 0} aria-label="上一张图片">
            <ChevronLeft />
          </button>
          <button type="button" onClick={() => goTo(Math.min(items.length - 1, active + 1))} disabled={active === items.length - 1} aria-label="下一张图片">
            <ChevronRight />
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="md-gallery-track"
        tabIndex={0}
        onScroll={updateActive}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            goTo(Math.max(0, active - 1))
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            goTo(Math.min(items.length - 1, active + 1))
          }
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' || event.button !== 0) return
          dragRef.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft }
          suppressClickRef.current = false
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag || drag.pointerId !== event.pointerId) return
          const distance = event.clientX - drag.startX
          if (Math.abs(distance) > 4) suppressClickRef.current = true
          event.currentTarget.scrollLeft = drag.scrollLeft - distance
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return
          dragRef.current = null
          if (suppressClickRef.current) {
            window.setTimeout(() => {
              suppressClickRef.current = false
            }, 0)
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null
          suppressClickRef.current = false
        }}
        onPointerLeave={() => {
          dragRef.current = null
          suppressClickRef.current = false
        }}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return
          event.preventDefault()
          event.stopPropagation()
          suppressClickRef.current = false
        }}
      >
        {items.map((item, index) => (
          <GalleryImage key={`${item.src}-${index}`} item={item} interactive={interactive} />
        ))}
      </div>
      <p className="md-gallery-hint">左右滑动，点击查看原图</p>
    </section>
  )
})

function markdownWithMediaPlaceholders(content: string): string {
  const withGalleries = replaceGalleryDirectives(content, (items) => (
    `\n\n![${GALLERY_ALT_PREFIX}${encodeGalleryItems(items)}](#blog-gallery)\n\n`
  ))
  const withDirectives = withGalleries.replace(VIDEO_DIRECTIVE_PATTERN, (directive, attributes: string) => {
    const src = directiveAttribute(attributes, 'src')
    if (!src) return directive
    return videoPlaceholder(src, directiveAttribute(attributes, 'title'))
  })

  return withDirectives.replace(VIDEO_TAG_PATTERN, (videoTag) => {
    const src = videoTag.match(/\ssrc="([^"]+)"/i)?.[1]
    if (!src) return videoTag
    const title = videoTag.match(/\stitle="([^"]*)"/i)?.[1] || ''
    return videoPlaceholder(decodeHtmlAttribute(src), decodeHtmlAttribute(title))
  })
}

function directiveAttribute(attributes: string, name: string): string {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))
  return match?.[1] ?? ''
}

function videoPlaceholder(src: string, title: string): string {
  const encodedTitle = encodeURIComponent(title)
  return `\n\n![${VIDEO_ALT_PREFIX}${encodedTitle}](<${src}>)\n\n`
}

function decodeHtmlAttribute(value: string): string {
  return value
    .split('&quot;').join('"')
    .split('&#39;').join("'")
    .split('&lt;').join('<')
    .split('&gt;').join('>')
    .split('&amp;').join('&')
}

function decodeVideoTitle(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return 'Video'
  }
}

interface MarkdownProps {
  content: string
  className?: string
  enableLightbox?: boolean
}

export const Markdown = memo(function Markdown({ content, className, enableLightbox = true }: MarkdownProps) {
  const { theme } = useTheme()
  const markdownRef = useRef<HTMLDivElement>(null)
  const codeTheme = (theme === 'dark' ? oneDark : oneLight) as Record<string, CSSProperties>
  const renderContent = useMemo(() => markdownWithMediaPlaceholders(content), [content])

  useEffect(() => {
    const gallery = markdownRef.current
    if (!gallery || !enableLightbox) return

    const lightbox = new PhotoSwipeLightbox({
      gallery,
      children: "a[data-zoomable='true']",
      pswpModule: () => import('photoswipe'),
      arrowPrev: true,
      arrowNext: true,
      arrowKeys: true,
      zoom: true,
      close: true,
      counter: true,
      wheelToZoom: true,
      bgOpacity: 0.96,
    })

    lightbox.on('uiRegister', () => {
      lightbox.pswp?.ui?.registerElement({
        name: 'custom-caption',
        order: 9,
        isButton: false,
        appendTo: 'root',
        html: '',
        onInit: (caption, pswp) => {
          pswp.on('change', () => {
            const trigger = pswp.currSlide?.data.element
            const text = trigger?.closest('.md-gallery-item')?.querySelector('.md-gallery-caption')?.innerHTML
              || trigger?.closest('.md-figure')?.querySelector('.md-figcaption')?.innerHTML
              || ''
            caption.innerHTML = text
            caption.classList.toggle('hidden', !text)
          })
        },
      })
    })
    lightbox.on('openingAnimationStart', () => document.body.classList.add('pswp-open'))
    lightbox.on('closingAnimationEnd', () => document.body.classList.remove('pswp-open'))
    lightbox.init()
    return () => {
      document.body.classList.remove('pswp-open')
      lightbox.destroy()
    }
  }, [enableLightbox])

  const components = useMemo<Components>(
    () => ({
      pre: ({ children }) => <>{children}</>,
      p: ({ node, children, ...props }) => {
        const onlyChild = node?.children.length === 1 ? node.children[0] : null
        const isVideoPlaceholder = onlyChild?.type === 'element'
          && onlyChild.tagName === 'img'
          && String(onlyChild.properties?.alt ?? '').startsWith(VIDEO_ALT_PREFIX)
        const isGalleryPlaceholder = onlyChild?.type === 'element'
          && onlyChild.tagName === 'img'
          && String(onlyChild.properties?.alt ?? '').startsWith(GALLERY_ALT_PREFIX)
        return isVideoPlaceholder || isGalleryPlaceholder ? <>{children}</> : <p {...props}>{children}</p>
      },
      h2: (props) => <AnchoredHeading level={2} {...props} />,
      h3: (props) => <AnchoredHeading level={3} {...props} />,
      a: ({ href = '', children, ...props }) => {
        const external = /^https?:\/\//.test(href)
        return (
          <a
            href={href}
            {...props}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {children}
            {external && <ExternalLink className="md-external-link" aria-hidden="true" />}
          </a>
        )
      },
      img: (props) => {
        const alt = props.alt || ''
        if (alt.startsWith(VIDEO_ALT_PREFIX)) {
          const encodedTitle = alt.slice(VIDEO_ALT_PREFIX.length)
          return <MarkdownVideo src={props.src} title={decodeVideoTitle(encodedTitle)} />
        }
        if (alt.startsWith(GALLERY_ALT_PREFIX)) {
          const items = decodeGalleryItems(alt.slice(GALLERY_ALT_PREFIX.length))
          return items.length >= 2 ? <MarkdownGallery items={items} interactive={enableLightbox} /> : null
        }
        return <MarkdownImage {...props} interactive={enableLightbox} />
      },
      table: ({ children }) => (
        <div className="md-table-wrap" tabIndex={0} role="region" aria-label="Horizontally scrollable data table">
          <table>{children}</table>
        </div>
      ),
      code({ className: codeClassName, children, ...props }) {
        const languageMatch = /language-([^\s]+)/.exec(codeClassName || '')
        const rawText = String(children)
        const isBlock = Boolean(languageMatch) || rawText.endsWith('\n')
        if (isBlock) {
          return (
            <CodeBlock
              language={languageMatch?.[1] || 'text'}
              text={rawText.replace(/\n$/, '')}
              style={codeTheme}
            />
          )
        }
        return (
          <code className={cn('md-inline-code', codeClassName)} {...props}>
            {children}
          </code>
        )
      },
    }),
    [codeTheme, enableLightbox],
  )

  return (
    <div ref={markdownRef} className={cn('markdown-body prose max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={components}
      >
        {renderContent}
      </ReactMarkdown>
    </div>
  )
})
