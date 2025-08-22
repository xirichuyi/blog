import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import type { Article } from '../../types/blog';
import ArticleCard from './ArticleCard';
import './ArticleDetail.css';

interface ArticleDetailProps {
  articleId: string;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ articleId }) => {
  const navigate = useNavigate();
  const { fetchArticleById, articles } = useData();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

  useEffect(() => {
    const loadArticle = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedArticle = await fetchArticleById(articleId);
        if (fetchedArticle) {
          setArticle(fetchedArticle);
          
          // Find related articles (same category, excluding current article)
          const related = articles
            .filter((a: Article) => a.id !== articleId && a.category === fetchedArticle.category)
            .slice(0, 3);
          setRelatedArticles(related);
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Failed to load article');
        console.error('Error loading article:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [articleId, fetchArticleById, articles]);

  const handleArticleClick = (id: string) => {
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

  const generateOutline = (content: string) => {
    const headings = content.match(/<h[2-3][^>]*>.*?<\/h[2-3]>/gi) || [];
    return headings.map((heading, index) => {
      const level = heading.match(/<h([2-3])/)?.[1] || '2';
      const text = heading.replace(/<[^>]*>/g, '');
      const id = `heading-${index}`;
      return { level: parseInt(level), text, id };
    });
  };

  if (isLoading) {
    return (
      <div className="article-detail-loading">
        <md-circular-progress indeterminate></md-circular-progress>
        <span className="md-typescale-body-large">Loading article...</span>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="article-detail-error">
        <md-icon className="error-icon">error_outline</md-icon>
        <h2 className="md-typescale-headline-medium">Article Not Found</h2>
        <p className="md-typescale-body-large">
          {error || 'The article you\'re looking for doesn\'t exist.'}
        </p>
        <md-filled-button onClick={() => navigate('/articles')}>
          <md-icon slot="icon">arrow_back</md-icon>
          Back to Articles
        </md-filled-button>
      </div>
    );
  }

  const outline = generateOutline(article.content || '');

  return (
    <div className="article-detail">
      <main className="article-main">
        <article className="article-header">
          {/* Hero Image */}
          {article.imageUrl && (
            <div className="article-hero-image">
              <img
                src={article.imageUrl.startsWith('http') 
                  ? article.imageUrl 
                  : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006'}${article.imageUrl}`
                }
                alt={article.title}
                loading="eager"
              />
            </div>
          )}

          <div className="article-header-content">
            {/* Article Meta */}
            <div className="article-meta">
              <md-assist-chip className="article-category">
                <md-icon slot="icon">category</md-icon>
                {article.category}
              </md-assist-chip>
              <span className="article-date md-typescale-body-medium">
                {formatDate(article.publishDate)}
              </span>
              <span className="article-read-time md-typescale-body-medium">
                {article.readTime} min read
              </span>
            </div>

            {/* Article Title */}
            <h1 className="article-title md-typescale-display-small">
              {article.title}
            </h1>

            {/* Article Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="article-tags">
                {article.tags.map((tag, index) => (
                  <md-filter-chip 
                    key={index}
                    className="article-tag"
                    disabled
                  >
                    {tag}
                  </md-filter-chip>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Article Content */}
        <div className="article-content">
          <div 
            className="article-body md-typescale-body-large"
            dangerouslySetInnerHTML={{ __html: article.content || '' }}
          />
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
                  onClick={handleArticleClick}
                  className="related-article-card"
                />
              ))}
            </div>
          </section>
        )}

        {/* See More Section */}
        <div className="see-more-section">
          <md-filled-button 
            className="see-more-button"
            onClick={() => navigate('/articles')}
          >
            <md-icon slot="icon">library_books</md-icon>
            See More Articles
          </md-filled-button>
        </div>
      </main>

      {/* Article Outline Sidebar */}
      {outline.length > 0 && (
        <aside className="article-sidebar">
          <div className="article-outline">
            <h3 className="outline-title md-typescale-title-medium">
              Table of Contents
            </h3>
            <nav className="outline-nav">
              {outline.map((item, index) => (
                <a
                  key={index}
                  href={`#${item.id}`}
                  className={`outline-item outline-level-${item.level} md-typescale-body-medium`}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
};

export default ArticleDetail;
