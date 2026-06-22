import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

function HeadingMarker({ level }: { level: number }) {
  return (
    <span
      aria-hidden
      className="absolute -left-12 top-[0.45em] hidden select-none font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 lg:inline"
    >
      H{level}
    </span>
  )
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const { theme } = useTheme()
  const codeTheme = theme === 'dark' ? oneDark : oneLight

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
          h2: ({ node: _n, children, ...props }) => (
            <h2 {...props} className="relative">
              <HeadingMarker level={2} />
              {children}
            </h2>
          ),
          h3: ({ node: _n, children, ...props }) => (
            <h3 {...props} className="relative">
              <HeadingMarker level={3} />
              {children}
            </h3>
          ),
          h4: ({ node: _n, children, ...props }) => (
            <h4 {...props} className="relative">
              <HeadingMarker level={4} />
              {children}
            </h4>
          ),
          // SyntaxHighlighter renders its own block element, so unwrap <pre>.
          pre: ({ children }) => <>{children}</>,
          code({ className: cls, children, ...props }) {
            const match = /language-(\w+)/.exec(cls || '')
            const text = String(children).replace(/\n$/, '')
            if (match) {
              return (
                <SyntaxHighlighter
                  language={match[1]}
                  style={codeTheme}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--muted))',
                    fontSize: 13,
                  }}
                  codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' } }}
                >
                  {text}
                </SyntaxHighlighter>
              )
            }
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
