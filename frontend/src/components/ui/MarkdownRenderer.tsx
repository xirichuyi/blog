import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import GithubSlugger from 'github-slugger';
import { apiService } from '../../services/api'
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-renderer ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug, // 自动生成标题ID
          [rehypeAutolinkHeadings, {
            behavior: 'wrap', // 将整个标题包装为链接
            properties: {
              className: 'heading-link',
              style: 'text-decoration: none; border-bottom: none;' // 禁用默认下划线
            }
          }]
        ]}
        components={{
          // Custom image renderer to handle relative URLs
          img: ({ src, alt, ...props }) => {
            const imageSrc = src ? apiService.getImageUrl(src) : '';
            return <img src={imageSrc} alt={alt} {...props} />;
          },
          // Custom code block renderer
          pre: ({ children, ...props }) => (
            <pre className="code-block" {...props}>
              {children}
            </pre>
          ),
          code: ({ children, ...props }: any) => {
            const inline = props.inline;
            if (inline) {
              return <code className="inline-code" {...props}>{children}</code>;
            }
            return <code {...props}>{children}</code>;
          },
          // Custom blockquote renderer
          blockquote: ({ children, ...props }) => (
            <blockquote className="markdown-blockquote" {...props}>
              {children}
            </blockquote>
          ),
          // Custom table renderer
          table: ({ children, ...props }) => (
            <div className="table-container">
              <table className="markdown-table" {...props}>
                {children}
              </table>
            </div>
          ),
          // Custom link renderer
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// 导出标题ID生成函数，供其他组件使用（与rehype-slug保持一致）
// 使用与rehype-slug相同的github-slugger算法
const slugger = new GithubSlugger();

export const generateHeadingId = (text: string): string => {
  // 重置slugger状态以确保一致性
  slugger.reset();
  return slugger.slug(text);
};

export default MarkdownRenderer;