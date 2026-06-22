import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'
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
    <div className="group/code my-5 overflow-hidden rounded-xl border border-border bg-muted">
      <div className="flex items-center justify-between border-b border-border/60 bg-background/40 px-4 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{language || 'text'}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={style}
        PreTag="div"
        customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: 13 }}
        codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' } }}
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
    <div
      className={cn(
        'prose prose-neutral max-w-none dark:prose-invert',
        'prose-headings:scroll-mt-24 prose-headings:font-semibold',
        'prose-a:text-foreground prose-a:underline-offset-4 hover:prose-a:text-primary',
        'prose-img:rounded-lg prose-img:border prose-img:border-border',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          pre: ({ children }) => <>{children}</>,
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
