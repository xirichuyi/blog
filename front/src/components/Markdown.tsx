import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
import { Check, Copy, ExternalLink } from 'lucide-react'
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
      resetTimer.current = window.setTimeout(() => setCopied(false), 1500)
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
          className="md-code-copy"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
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
          style: { fontFamily: '"SFMono-Regular", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace' },
        }}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  )
})

export const Markdown = memo(function Markdown({ content, className }: { content: string; className?: string }) {
  const { theme } = useTheme()
  const codeTheme = (theme === 'dark' ? oneDark : oneLight) as Record<string, CSSProperties>
  const components = useMemo<Components>(
    () => ({
      pre: ({ children }) => <>{children}</>,
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
      img: ({ src, alt = '', ...props }) => (
        <span className="md-figure">
          <span className="md-image-frame">
            <img src={src} alt={alt} loading="lazy" decoding="async" {...props} />
          </span>
          {alt && <span className="md-figcaption">{alt}</span>}
        </span>
      ),
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
    [codeTheme],
  )

  return (
    <div className={cn('markdown-body prose max-w-none', className)}>
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
