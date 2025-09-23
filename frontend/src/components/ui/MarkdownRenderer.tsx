import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
        components={{
          // Custom heading renderer to add IDs for navigation
          h1: ({ children, ...props }) => {
            const id = typeof children === 'string'
              ? children.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
                .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
              : '';
            return <h1 id={id} {...props}>{children}</h1>;
          },
          h2: ({ children, ...props }) => {
            const id = typeof children === 'string'
              ? children.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
                .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
              : '';
            return <h2 id={id} {...props}>{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            const id = typeof children === 'string'
              ? children.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
                .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
              : '';
            return <h3 id={id} {...props}>{children}</h3>;
          },
          h4: ({ children, ...props }) => {
            const id = typeof children === 'string'
              ? children.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
                .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
              : '';
            return <h4 id={id} {...props}>{children}</h4>;
          },
          h5: ({ children, ...props }) => {
            const id = typeof children === 'string'
              ? children.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
                .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
              : '';
            return <h5 id={id} {...props}>{children}</h5>;
          },
          h6: ({ children, ...props }) => {
            const id = typeof children === 'string'
              ? children.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
                .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
              : '';
            return <h6 id={id} {...props}>{children}</h6>;
          },
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

export default MarkdownRenderer;
