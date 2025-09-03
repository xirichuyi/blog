import React from 'react';
import { apiService } from '../../services/api';
import type { Article } from '../../types/blog';
import './ArticleCard.css';

interface ArticleCardProps extends Article {
  onClick?: (id: string) => void;
  className?: string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  id,
  title,
  excerpt,
  author,
  publishDate,
  readTime,
  category,
  tags,
  imageUrl,
  featured = false,
  onClick,
  className = ""
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <md-elevated-card
      className={`article-card ${featured ? 'article-card-featured' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Article: ${title}`}
    >
      {imageUrl && (
        <div className="article-card-media">
          <img
            src={apiService.getImageUrl(imageUrl)}
            alt={title}
            className="article-card-image"
            loading="lazy"
          />
          {featured && (
            <div className="article-card-featured-badge">
              <md-icon>star</md-icon>
              <span className="md-typescale-label-small">Featured</span>
            </div>
          )}
        </div>
      )}

      <div className="article-card-content">
        <div className="article-card-header">
          <md-assist-chip className="article-card-category">
            <md-icon slot="icon">category</md-icon>
            {category}
          </md-assist-chip>

          <div className="article-card-meta">
            <span className="article-card-date md-typescale-body-small">
              {formatDate(publishDate)}
            </span>
            <span className="article-card-read-time md-typescale-body-small">
              {readTime} min read
            </span>
          </div>
        </div>

        <h3 className="article-card-title md-typescale-headline-small">
          {title}
        </h3>

        <p className="article-card-excerpt md-typescale-body-medium">
          {excerpt}
        </p>

        <div className="article-card-tags">
          {tags.slice(0, 3).map((tag, index) => (
            <md-filter-chip
              key={index}
              className="article-card-tag"
              disabled
            >
              {tag}
            </md-filter-chip>
          ))}
          {tags.length > 3 && (
            <span className="article-card-more-tags md-typescale-body-small">
              +{tags.length - 3} more
            </span>
          )}
        </div>

        <div className="article-card-footer">
          <div className="article-card-author">
            <md-icon className="article-card-author-icon">person</md-icon>
            <span className="article-card-author-name md-typescale-body-small">
              {author}
            </span>
          </div>

          <md-filled-tonal-icon-button
            className="article-card-action"
            aria-label="Read article"
          >
            <md-icon>arrow_forward</md-icon>
          </md-filled-tonal-icon-button>
        </div>
      </div>
    </md-elevated-card>
  );
};

export default ArticleCard;
