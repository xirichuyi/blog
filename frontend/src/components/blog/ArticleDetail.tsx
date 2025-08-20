import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ArticleCard from './ArticleCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import { apiService } from '../../services/api';
import type { Article } from '../../types/blog';
import './ArticleDetail.css';

interface ArticleDetailProps {
  articleId: string;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({
  articleId
}) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [headings, setHeadings] = useState<Array<{id: string, text: string, level: number}>>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');

  const navigate = useNavigate();
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

  useEffect(() => {
    const loadArticle = async () => {
      console.log('Loading article with ID:', articleId);
      setIsLoading(true);
      try {
        const response = await apiService.getPost(articleId);
        if (response.success && response.data) {
          console.log('Fetched article:', response.data);
          setArticle(response.data);

          // Load related articles (same category)
          if (response.data.category) {
            const relatedResponse = await apiService.getPostsByCategory(response.data.category);
            if (relatedResponse.success && relatedResponse.data) {
              const related = relatedResponse.data
                .filter((a: Article) => a.id !== response.data!.id)
                .slice(0, 2);
              setRelatedArticles(related);
            }
          }
        } else {
          console.error('Failed to load article:', response.error);
          setArticle(null);
        }
      } catch (error) {
        console.error('Failed to load article:', error);
        setArticle(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (articleId) {
      loadArticle();
    }
  }, [articleId]);



  // Scroll spy for active heading with debounce and improved logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      // Clear previous timeout to debounce
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const headingElements = document.querySelectorAll('.article-body h2, .article-body h3');
        if (headingElements.length === 0) return;

        const OFFSET_TOP = 120; // Fixed offset from top
        const VIEWPORT_HEIGHT = window.innerHeight;
        let activeId = '';
        let bestCandidate = null;
        let bestScore = -1;

        headingElements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top;
          const elementBottom = rect.bottom;

          // Skip elements that are completely out of view
          if (elementBottom < 0 || elementTop > VIEWPORT_HEIGHT) {
            return;
          }

          // Calculate a score based on position relative to the offset
          let score = 0;

          if (elementTop <= OFFSET_TOP) {
            // Element is above or at the offset line
            // Prefer elements closer to the offset (higher score for closer elements)
            score = 1000 - Math.abs(elementTop - OFFSET_TOP);
          } else {
            // Element is below the offset line
            // Give lower score, but still consider it if it's the first visible element
            score = 500 - elementTop;
          }

          // Prefer elements that are more visible (not cut off at top)
          if (elementTop >= 0) {
            score += 100;
          }

          if (score > bestScore) {
            bestScore = score;
            bestCandidate = element.id; // Use the actual element ID
          }
        });

        if (bestCandidate !== null) {
          activeId = bestCandidate;
        }

        setActiveHeading(activeId);
      }, 10); // 10ms debounce
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [article]);

  // Helper function to generate consistent heading IDs
  const generateHeadingId = (text: string): string => {
    return text.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
  };

  // Add IDs to headings and extract heading information
  useEffect(() => {
    if (article?.content) {
      const articleBody = document.querySelector('.article-body');
      if (articleBody) {
        const headingElements = articleBody.querySelectorAll('h2, h3');
        const extractedHeadings: Array<{id: string, text: string, level: number}> = [];
        const usedIds = new Set<string>();

        headingElements.forEach((heading) => {
          const text = heading.textContent || '';
          const id = generateHeadingId(text);

          // Only set ID if it doesn't already exist (MarkdownRenderer might have set it)
          if (!heading.id) {
            // Ensure unique ID by adding a suffix if needed
            let uniqueId = id;
            let counter = 1;
            while (usedIds.has(uniqueId)) {
              uniqueId = `${id}-${counter}`;
              counter++;
            }
            heading.id = uniqueId;
            usedIds.add(uniqueId);
          } else {
            // If heading already has an ID, make sure it's unique
            let uniqueId = heading.id;
            let counter = 1;
            while (usedIds.has(uniqueId)) {
              uniqueId = `${heading.id}-${counter}`;
              counter++;
            }
            if (uniqueId !== heading.id) {
              heading.id = uniqueId;
            }
            usedIds.add(uniqueId);
          }

          extractedHeadings.push({
            id: heading.id, // Use the actual ID from the element
            text,
            level: parseInt(heading.tagName.charAt(1))
          });
        });

        setHeadings(extractedHeadings);
      }
    }
  }, [article]);







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
        <md-filled-button onClick={() => navigate('/articles')}>
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

      {/* Main Content */}
      <div className="article-main">
        {/* Article Header */}
        <header className="article-header">

        {(article.imageUrl || article.coverImage) && (
          <div className="article-hero-image">
            <img
              src={
                (article.imageUrl || article.coverImage)?.startsWith('http')
                  ? (article.imageUrl || article.coverImage)
                  : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006'}${article.imageUrl || article.coverImage}`
              }
              alt={article.title}
            />
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
        <MarkdownRenderer
          content={article.content || ''}
          className="article-body md-typescale-body-large"
        />
      </div>

      {/* See More Articles Button */}
      <div className="see-more-section">
        <h3 className="see-more-title md-typescale-headline-medium">
          Explore More Articles
        </h3>
        <p className="see-more-description md-typescale-body-medium">
          Discover more insights and tutorials on web development and design.
        </p>
        <md-elevated-button
          className="see-more-button"
          onClick={() => navigate('/articles')}
        >
          See More Articles
        </md-elevated-button>
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
      </div>

      {/* Article Sidebar */}
      <aside className="article-sidebar">
        <div className="article-outline">
          <h3 className="outline-title">
            <md-icon>format_list_bulleted</md-icon>
            Outline
          </h3>
          {headings.length > 0 ? (
            <ul className="outline-list">
              {headings.map((heading) => (
                <li key={heading.id} className="outline-item">
                  <a
                    href={`#${heading.id}`}
                    className={`outline-link level-${heading.level} ${
                      activeHeading === heading.id ? 'active' : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(heading.id);
                      if (element) {
                        const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
                        const offsetTop = 120; // Same as OFFSET_TOP in scroll detection
                        window.scrollTo({
                          top: elementTop - offsetTop,
                          behavior: 'smooth'
                        });
                      }
                    }}
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="md-typescale-body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
              No headings found in this article.
            </p>
          )}
        </div>
      </aside>
    </article>
  );
};

export default ArticleDetail;
