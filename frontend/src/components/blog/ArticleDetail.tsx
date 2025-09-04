import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { apiService } from '../../services/api';
import type { Article } from '../../types/blog';
import ArticleCard from './ArticleCard';
import MarkdownRenderer from '../ui/MarkdownRenderer';
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
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [isScrollingToHeading, setIsScrollingToHeading] = useState(false);

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

  // Simple scroll-based heading tracking
  const updateActiveHeading = useCallback(() => {
    // Skip update if we're programmatically scrolling
    if (isScrollingToHeading) return;

    // Find all headings with IDs
    const headings = Array.from(document.querySelectorAll('h2[id], h3[id]'));

    if (headings.length === 0) return;

    // Get current scroll position
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const triggerPoint = scrollTop + windowHeight * 0.2; // 20% from top of viewport for more sensitive tracking

    // Find the active heading
    let activeId = '';

    for (let i = headings.length - 1; i >= 0; i--) {
      const heading = headings[i] as HTMLElement;
      const headingTop = heading.offsetTop;

      if (headingTop <= triggerPoint) {
        activeId = heading.id;
        break;
      }
    }

    // If we're at the very top, activate the first heading
    if (!activeId && headings.length > 0 && scrollTop < 200) {
      activeId = (headings[0] as HTMLElement).id;
    }

    if (activeId && activeId !== activeHeading) {
      setActiveHeading(activeId);
    }
  }, [activeHeading, isScrollingToHeading]);

  // Setup scroll listener after article content is rendered
  useEffect(() => {
    if (article && !isLoading) {
      // Wait for DOM to update and markdown to render
      const timer = setTimeout(() => {
        updateActiveHeading(); // Initial call
      }, 500);

      // Throttled scroll handler for better performance
      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            updateActiveHeading();
            ticking = false;
          });
          ticking = true;
        }
      };

      // Add scroll listener
      window.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [article, isLoading, updateActiveHeading]);

  const handleArticleClick = (id: string) => {
    navigate(`/article/${id}`);
  };

  const handleOutlineClick = (e: React.MouseEvent<HTMLAnchorElement>, headingId: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(headingId);
    if (targetElement) {
      // Set scrolling flag to prevent updates during programmatic scroll
      setIsScrollingToHeading(true);

      // Update active heading immediately for better UX
      setActiveHeading(headingId);

      const offsetTop = targetElement.offsetTop - 100; // Account for fixed header
      const targetPosition = offsetTop;

      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });

      // More precise scroll completion detection
      let checkCount = 0;
      const maxChecks = 40; // Maximum 2 seconds of checking

      const checkScrollComplete = () => {
        const currentPosition = window.scrollY;
        const isNearTarget = Math.abs(currentPosition - targetPosition) < 10;
        const hasStoppedScrolling = checkCount > 10 && Math.abs(currentPosition - targetPosition) < 50;

        checkCount++;

        if (isNearTarget || hasStoppedScrolling || checkCount >= maxChecks) {
          setIsScrollingToHeading(false);
        } else {
          setTimeout(checkScrollComplete, 50);
        }
      };

      // Start checking after a short delay
      setTimeout(checkScrollComplete, 200);
    }
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
    // Extract headings from Markdown content instead of HTML
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const headings: Array<{ level: number; text: string; id: string }> = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens

      if (level >= 2 && level <= 3) { // Only include h2 and h3
        headings.push({ level, text, id });
      }
    }

    return headings;
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
                src={apiService.getImageUrl(article.imageUrl)}
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
          <MarkdownRenderer
            content={article.content || ''}
            className="article-body md-typescale-body-large"
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
                  simplified={true}
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
                <div
                  key={index}
                  className={`outline-item outline-level-${item.level} md-typescale-body-medium ${activeHeading === item.id ? 'active' : ''
                    }`}
                >
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => handleOutlineClick(e, item.id)}
                  >
                    {item.text}
                  </a>
                </div>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
};

export default ArticleDetail;
