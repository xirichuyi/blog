import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ArticleCard from './ArticleCard';
import LoadingSpinner from '../ui/LoadingSpinner';
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

  // Mock articles data for immediate testing
  const mockArticles = useMemo(() => [
    {
      id: '1',
      title: 'Getting Started with Material Design 3',
      excerpt: 'Learn how to implement Material Design 3 in your React applications with practical examples and best practices.',
      author: 'Cyrus Chen',
      publishDate: '2024-01-15',
      readTime: 8,
      category: 'Design',
      tags: ['Material Design', 'React', 'UI/UX'],
      imageUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=400&fit=crop',
      featured: true,
      content: `
        <h2>Introduction to Material Design 3</h2>
        <p>Material Design 3 represents the latest evolution of Google's design system, bringing fresh perspectives on color, typography, and component design. This comprehensive guide will walk you through implementing Material Design 3 in your React applications.</p>

        <h2>Key Features of Material Design 3</h2>
        <p>Material Design 3 introduces several groundbreaking features that enhance user experience:</p>
        <ul>
          <li><strong>Dynamic Color:</strong> Adaptive color palettes that respond to user preferences</li>
          <li><strong>Improved Typography:</strong> Enhanced readability with new font scales</li>
          <li><strong>Updated Components:</strong> Refined components with better accessibility</li>
          <li><strong>Motion Design:</strong> Smooth animations that guide user attention</li>
        </ul>

        <h3>Getting Started with Implementation</h3>
        <p>To begin implementing Material Design 3 in your React project, you'll need to install the necessary dependencies and configure your design tokens.</p>

        <pre><code>npm install @material/web
npm install @material/material-color-utilities</code></pre>

        <h3>Setting Up Your Color Scheme</h3>
        <p>One of the most exciting features of Material Design 3 is the dynamic color system. Here's how you can implement it:</p>

        <blockquote>
          "Material Design 3's dynamic color system creates a cohesive and accessible color palette that adapts to user preferences and content."
        </blockquote>

        <h2>Best Practices</h2>
        <p>When implementing Material Design 3, keep these best practices in mind:</p>
        <ol>
          <li>Always prioritize accessibility in your color choices</li>
          <li>Use the design tokens consistently across your application</li>
          <li>Test your implementation across different devices and screen sizes</li>
          <li>Leverage the motion design principles for better user guidance</li>
        </ol>

        <h2>Conclusion</h2>
        <p>Material Design 3 offers a powerful foundation for creating modern, accessible, and beautiful user interfaces. By following the principles and practices outlined in this guide, you'll be well-equipped to create exceptional user experiences.</p>
      `
    },
    {
      id: '2',
      title: 'Advanced React Patterns for Modern Applications',
      excerpt: 'Explore advanced React patterns including compound components, render props, and custom hooks.',
      author: 'Cyrus Chen',
      publishDate: '2024-01-12',
      readTime: 12,
      category: 'Development',
      tags: ['React', 'JavaScript', 'Patterns'],
      imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop',
      content: `
        <h2>Mastering Advanced React Patterns</h2>
        <p>As React applications grow in complexity, understanding advanced patterns becomes crucial for maintaining clean, reusable, and efficient code.</p>

        <h2>1. Compound Components Pattern</h2>
        <p>The compound components pattern allows you to create components that work together to form a complete UI element.</p>

        <pre><code>function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    &lt;div className="tabs"&gt;
      {React.Children.map(children, child =&gt;
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    &lt;/div&gt;
  );
}</code></pre>

        <h2>2. Custom Hooks Pattern</h2>
        <p>Custom hooks allow you to extract component logic into reusable functions.</p>

        <h2>Conclusion</h2>
        <p>Advanced React patterns are powerful tools that can significantly improve your code quality and developer experience.</p>
      `
    },
    {
      id: '3',
      title: 'Building Responsive Web Applications',
      excerpt: 'Master the art of creating responsive web applications that work seamlessly across all devices.',
      author: 'Cyrus Chen',
      publishDate: '2024-01-10',
      readTime: 6,
      category: 'Development',
      tags: ['CSS', 'Responsive Design', 'Mobile'],
      imageUrl: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=400&fit=crop',
      content: `
        <h2>The Art of Responsive Web Design</h2>
        <p>In today's multi-device world, creating responsive web applications isn't just a nice-to-have—it's essential.</p>

        <h2>Core Principles of Responsive Design</h2>
        <p>Responsive design is built on three fundamental principles:</p>

        <h3>1. Fluid Grids</h3>
        <p>Instead of fixed-width layouts, use relative units like percentages and viewport units.</p>

        <h2>Conclusion</h2>
        <p>Building responsive web applications requires a combination of technical skills, design thinking, and attention to detail.</p>
      `
    }
  ], []);

  useEffect(() => {
    const loadArticle = async () => {
      console.log('Loading article with ID:', articleId);
      setIsLoading(true);
      try {
        // Use mock data for immediate testing
        const fetchedArticle = mockArticles.find(article => article.id === articleId) || null;
        console.log('Fetched article:', fetchedArticle);
        setArticle(fetchedArticle);
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
  }, [articleId, mockArticles]);

  // Extract headings from article content
  useEffect(() => {
    if (article?.content) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(article.content, 'text/html');
      const headingElements = doc.querySelectorAll('h2, h3');

      const extractedHeadings = Array.from(headingElements).map((heading, index) => {
        const text = heading.textContent || '';
        const level = parseInt(heading.tagName.charAt(1));
        const id = `heading-${index}`;
        return { id, text, level };
      });

      setHeadings(extractedHeadings);
    }
  }, [article]);

  // Scroll spy for active heading
  useEffect(() => {
    const handleScroll = () => {
      // Handle active heading
      const headingElements = document.querySelectorAll('.article-body h2, .article-body h3');
      let activeId = '';
      let closestDistance = Infinity;

      headingElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const distance = Math.abs(rect.top - 100); // Distance from the top offset

        // Find the heading closest to the top offset (100px from top)
        if (rect.top <= 150 && distance < closestDistance) {
          closestDistance = distance;
          activeId = `heading-${index}`;
        }
      });

      // If no heading is close to the top, find the first visible heading
      if (!activeId) {
        headingElements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight) {
            activeId = `heading-${index}`;
            return;
          }
        });
      }

      setActiveHeading(activeId);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, [article]);

  // Add IDs to headings in the content
  useEffect(() => {
    if (article?.content) {
      const articleBody = document.querySelector('.article-body');
      if (articleBody) {
        const headingElements = articleBody.querySelectorAll('h2, h3');
        headingElements.forEach((heading, index) => {
          heading.id = `heading-${index}`;
        });
      }
    }
  }, [article]);

  // Get related articles (articles in the same category, excluding current article)
  const relatedArticles = article
    ? mockArticles
        .filter(a => a.id !== article.id && a.category === article.category)
        .slice(0, 2)
    : [];





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
                      document.getElementById(heading.id)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
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
