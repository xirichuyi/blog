import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

function CodeBlock({ language, text, style }: { language: string; text: string; style: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="md-code-block group/code">
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
          style: { fontFamily: '"SFMono-Regular", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace' },
        }}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  )
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const { theme } = useTheme()
  const codeTheme = (theme === 'dark' ? oneDark : oneLight) as Record<string, unknown>

  return (
    <div className={cn('markdown-body prose max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
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
          code({ className: cls, children, ...props }) {
            const match = /language-(\w+)/.exec(cls || '')
            const text = String(children).replace(/\n$/, '')
            if (match) return <CodeBlock language={match[1]} text={text} style={codeTheme} />
            return (
              <code className={cn('rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-normal', cls)} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
