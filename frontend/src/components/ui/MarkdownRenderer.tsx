import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
              ? children.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
              : '';
            return <h1 id={id} {...props}>{children}</h1>;
          },
          h2: ({ children, ...props }) => {
            const id = typeof children === 'string' 
              ? children.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
              : '';
            return <h2 id={id} {...props}>{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            const id = typeof children === 'string' 
              ? children.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
              : '';
            return <h3 id={id} {...props}>{children}</h3>;
          },
          // Custom image renderer to handle relative URLs
          img: ({ src, alt, ...props }) => {
            const imageSrc = src?.startsWith('http') 
              ? src 
              : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006'}${src}`;
            return <img src={imageSrc} alt={alt} {...props} />;
          },
          // Custom code block renderer
          pre: ({ children, ...props }) => (
            <pre className="code-block" {...props}>
              {children}
            </pre>
          ),
          code: ({ inline, children, ...props }) => {
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
