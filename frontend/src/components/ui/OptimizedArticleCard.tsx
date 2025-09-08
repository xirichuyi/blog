// Optimized Article Card component with performance enhancements

import React, { memo, useCallback } from 'react';
import OptimizedImage from './OptimizedImage';
import { useIntersectionObserver } from '../../utils/performanceUtils';
import type { Article } from '../../types';
import './OptimizedArticleCard.css';

interface OptimizedArticleCardProps {
  article: Article;
  onClick: (articleId: string) => void;
  className?: string;
  showImage?: boolean;
  showExcerpt?: boolean;
  showTags?: boolean;
  showReadTime?: boolean;
  priority?: boolean; // For above-the-fold content
}

const OptimizedArticleCard: React.FC<OptimizedArticleCardProps> = memo(({
  article,
  onClick,
  className = '',
  showImage = true,
  showExcerpt = true,
  showTags = true,
  showReadTime = true,
  priority = false
}) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const { isIntersecting, hasIntersected } = useIntersectionObserver(cardRef, {
    threshold: 0.1,
    rootMargin: '100px'
  });

  // Memoized click handler
  const handleClick = useCallback(() => {
    onClick(article.id);
  }, [onClick, article.id]);

  // Memoized tag click handler
  const handleTagClick = useCallback((e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    // Navigate to tag page or filter
    console.log('Tag clicked:', tag);
  }, []);

  // Format date
  const formattedDate = React.useMemo(() => {
    return new Date(article.publishDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [article.publishDate]);

  // Only render content when intersected or priority
  const shouldRenderContent = priority || hasIntersected;

  return (
    <div
      ref={cardRef}
      className={`optimized-article-card ${className} ${isIntersecting ? 'in-view' : ''}`}
      onClick={handleClick}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {shouldRenderContent ? (
        <>
          {/* Image Section */}
          {showImage && article.imageUrl && (
            <div className="article-image-container">
              <OptimizedImage
                src={article.imageUrl}
                alt={article.title}
                className="article-image"
                placeholder="/images/placeholder.jpg"
                priority={priority}
                onLoad={() => console.log(`Image loaded for ${article.title}`)}
                onError={() => console.log(`Image failed to load for ${article.title}`)}
              />
              <div className="image-overlay">
                <span className="category-badge">{article.category}</span>
              </div>
            </div>
          )}

          {/* Content Section */}
          <div className="article-content">
            {/* Header */}
            <div className="article-header">
              <h3 className="article-title">{article.title}</h3>
              <div className="article-meta">
                <span className="article-date">{formattedDate}</span>
                {showReadTime && (
                  <>
                    <span className="meta-separator">•</span>
                    <span className="read-time">{article.readTime} min read</span>
                  </>
                )}
              </div>
            </div>

            {/* Excerpt */}
            {showExcerpt && article.excerpt && (
              <p className="article-excerpt">{article.excerpt}</p>
            )}

            {/* Tags */}
            {showTags && article.tags && article.tags.length > 0 && (
              <div className="article-tags">
                {article.tags.slice(0, 3).map((tag) => (
                  <button
                    key={tag}
                    className="tag-button"
                    onClick={(e) => handleTagClick(e, tag)}
                    aria-label={`Filter by ${tag}`}
                  >
                    {tag}
                  </button>
                ))}
                {article.tags.length > 3 && (
                  <span className="more-tags">+{article.tags.length - 3} more</span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="article-footer">
              <div className="author-info">
                <span className="author-name">By {article.author}</span>
              </div>
              <div className="article-actions">
                <button
                  className="read-more-button"
                  onClick={handleClick}
                  aria-label={`Read article: ${article.title}`}
                >
                  Read More
                  <svg className="arrow-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Skeleton loader for non-priority content
        <div className="article-skeleton">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-meta"></div>
            <div className="skeleton-excerpt"></div>
            <div className="skeleton-tags"></div>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedArticleCard.displayName = 'OptimizedArticleCard';

export default OptimizedArticleCard;
