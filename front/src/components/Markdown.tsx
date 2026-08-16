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
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

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
          aria-label={copied ? '代码已复制' : '复制代码'}
          className={cn('md-code-copy', copied && 'copied')}
        >
          <span aria-hidden="true">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </span>
          {copied ? '已复制' : '复制'}
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
        aria-label={copied ? '链接已复制' : '复制标题链接'}
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
        aria-label={interactive ? (alt ? `查看大图：${alt}` : '查看大图') : undefined}
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

interface MarkdownProps {
  content: string
  className?: string
  enableLightbox?: boolean
}

export const Markdown = memo(function Markdown({ content, className, enableLightbox = true }: MarkdownProps) {
  const { theme } = useTheme()
  const markdownRef = useRef<HTMLDivElement>(null)
  const codeTheme = (theme === 'dark' ? oneDark : oneLight) as Record<string, CSSProperties>

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
            const text = trigger?.closest('.md-figure')?.querySelector('.md-figcaption')?.innerHTML || ''
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
      img: (props) => <MarkdownImage {...props} interactive={enableLightbox} />,
      table: ({ children }) => (
        <div className="md-table-wrap" tabIndex={0} role="region" aria-label="可横向滚动的数据表格">
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
        {content}
      </ReactMarkdown>
    </div>
  )
})
