import React, { useState, useCallback } from 'react';
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

// 自定义图片组件
const MarkdownImage: React.FC<{ src?: string; alt?: string;[key: string]: any }> = ({ src, alt, ...props }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoaded(true);
    setImageError(true);
  }, []);

  const imageSrc = src ? apiService.getImageUrl(src) : '';

  if (!imageSrc) return null;

  return (
    <div className={`markdown-image-container ${!imageLoaded ? 'loading' : ''} ${imageError ? 'error' : ''}`}>
      {!imageLoaded && !imageError && (
        <div className="markdown-image-placeholder">
          <md-circular-progress indeterminate></md-circular-progress>
          <span>Loading image...</span>
        </div>
      )}
      {imageError && (
        <div className="markdown-image-error">
          <md-icon>broken_image</md-icon>
          <span>Failed to load image</span>
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          opacity: imageLoaded && !imageError ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
        {...props}
      />
    </div>
  );
};

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
          // Custom image renderer to handle relative URLs and loading states
          img: MarkdownImage,
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