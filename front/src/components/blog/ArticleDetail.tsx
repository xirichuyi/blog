import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ArticleCard from './ArticleCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import useBlogData from '../../hooks/useBlogData';
import type { Article } from '../../types/blog';
import { CustomButton } from '../ui/CustomButton';
import './ArticleDetail.css';

interface ArticleDetailProps {
  articleId: string;
  onBack?: () => void;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({
  articleId,
  onBack
}) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const navigate = useNavigate();
  const { articles, fetchArticleById } = useBlogData();

  useEffect(() => {
    const loadArticle = async () => {
      setIsLoading(true);
      try {
        const fetchedArticle = await fetchArticleById(articleId);
        setArticle(fetchedArticle);
      } catch (error) {
        console.error('Failed to load article:', error);
        setArticle(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [articleId, fetchArticleById]);

  // Get related articles (articles in the same category, excluding current article)
  const relatedArticles = article
    ? articles
        .filter(a => a.id !== article.id && a.category === article.category)
        .slice(0, 2)
    : [];

  const handleBookmarkToggle = () => {
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark functionality
  };

  const handleShare = () => {
    if (navigator.share && article) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      console.log('Link copied to clipboard');
    }
  };

  const handleRelatedArticleClick = (id: string) => {
    navigate(`/article/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading article..."
        className="article-detail-loading"
      />
    );
  }

  if (!article) {
    return (
      <div className="article-detail-error">
        <md-icon className="error-icon">error</md-icon>
        <h2 className="md-typescale-headline-medium">Article not found</h2>
        <p className="md-typescale-body-medium">The article you're looking for doesn't exist.</p>
        <md-filled-button onClick={onBack}>
          <md-icon slot="icon">arrow_back</md-icon>
          Back to Articles
        </md-filled-button>
      </div>
    );
  }

  return (
    <article className="article-detail">
      <Helmet>
        <title>{article.title} - Cyrus Blog</title>
        <meta name="description" content={article.excerpt} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt} />
        {article.imageUrl && <meta property="og:image" content={article.imageUrl} />}
      </Helmet>

      {/* Article Header */}
      <header className="article-header">
        <div className="article-header-actions">
          <md-icon-button onClick={onBack} aria-label="Back to articles">
            <md-icon>arrow_back</md-icon>
          </md-icon-button>
          
          <div className="article-header-actions-right">
            <md-filled-tonal-icon-button
              onClick={handleBookmarkToggle}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              className={isBookmarked ? 'bookmarked' : ''}
            >
              <md-icon>{isBookmarked ? 'bookmark' : 'bookmark_border'}</md-icon>
            </md-filled-tonal-icon-button>
            <md-outlined-icon-button onClick={handleShare} aria-label="Share article">
              <md-icon>share</md-icon>
            </md-outlined-icon-button>
          </div>
        </div>

        {article.imageUrl && (
          <div className="article-hero-image">
            <img src={article.imageUrl} alt={article.title} />
          </div>
        )}

        <div className="article-header-content">
          <div className="article-meta">
            <md-assist-chip className="article-category">
              <md-icon slot="icon">category</md-icon>
              {article.category}
            </md-assist-chip>
            <span className="article-date md-typescale-body-small">
              {formatDate(article.publishDate)}
            </span>
            <span className="article-read-time md-typescale-body-small">
              {article.readTime} min read
            </span>
          </div>

          <h1 className="article-title md-typescale-display-small">
            {article.title}
          </h1>

          <div className="article-author-info">
            <md-icon className="author-icon">person</md-icon>
            <span className="author-name md-typescale-title-medium">
              By {article.author}
            </span>
          </div>

          <div className="article-tags">
            {article.tags.map((tag, index) => (
              <md-filter-chip key={index} className="article-tag" disabled>
                {tag}
              </md-filter-chip>
            ))}
          </div>
        </div>
      </header>

      {/* Article Content */}
      <div className="article-content">
        <div
          className="article-body md-typescale-body-large"
          dangerouslySetInnerHTML={{ __html: article.content || '' }}
        />
      </div>

      {/* See More Articles Button */}
      <div className="see-more-section">
        <CustomButton
          variant="filled"
          size="large"
          className="see-more-button"
          onClick={() => navigate('/articles')}
        >
          See More Articles
        </CustomButton>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="related-articles">
          <h2 className="related-articles-title md-typescale-headline-medium">
            Related Articles
          </h2>
          <div className="related-articles-grid">
            {relatedArticles.map((relatedArticle) => (
              <ArticleCard
                key={relatedArticle.id}
                {...relatedArticle}
                onClick={handleRelatedArticleClick}
                className="related-article-card"
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};

export default ArticleDetail;
