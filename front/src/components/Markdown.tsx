import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { cn } from '@/lib/utils'

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none dark:prose-invert',
        'prose-headings:scroll-mt-24 prose-headings:font-semibold',
        'prose-a:text-foreground prose-a:underline-offset-4 hover:prose-a:text-primary',
        'prose-pre:bg-transparent prose-pre:p-0 prose-img:rounded-lg prose-img:border prose-img:border-border',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
