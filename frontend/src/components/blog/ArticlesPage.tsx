import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import type { Article } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';

import './ArticlesPage.css';

// 分页常量
const ARTICLES_PER_PAGE = 12;

const ArticlesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    categories,
    tags,
    articles: contextArticles,
    isLoading,
    articlesLoading,
    error,
    articlesError,
    fetchArticles,
    fetchArticlesByCategory,
    fetchArticlesByTag
  } = useData();

  // Local article states for filtered results
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);

  // Active filter state - only one filter can be active at a time
  const [activeFilter, setActiveFilter] = useState<{type: 'category' | 'tag' | null, id: string | null}>({
    type: 'category',
    id: 'all'
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // Load articles based on current filter
  const loadArticles = useCallback(async (page: number = 1) => {
    try {
      let result;

      if (activeFilter.type === 'category' && activeFilter.id !== 'all' && activeFilter.id) {
        // Load articles by category
        const categoryArticles = await fetchArticlesByCategory(activeFilter.id);
        // For category filtering, we get all articles and handle pagination locally
        const startIndex = (page - 1) * ARTICLES_PER_PAGE;
        const endIndex = startIndex + ARTICLES_PER_PAGE;
        setArticles(categoryArticles.slice(startIndex, endIndex));
        setTotalArticles(categoryArticles.length);
      } else if (activeFilter.type === 'tag' && activeFilter.id) {
        // Load articles by tag
        const tagArticles = await fetchArticlesByTag(activeFilter.id);
        // For tag filtering, we get all articles and handle pagination locally
        const startIndex = (page - 1) * ARTICLES_PER_PAGE;
        const endIndex = startIndex + ARTICLES_PER_PAGE;
        setArticles(tagArticles.slice(startIndex, endIndex));
        setTotalArticles(tagArticles.length);
      } else {
        // Load all articles with server-side pagination
        result = await fetchArticles(page, ARTICLES_PER_PAGE);
        if (result) {
          setArticles(result.articles);
          setTotalArticles(result.total);
        }
      }
    } catch (error) {
      console.error('Failed to load articles:', error);
    }
  }, [fetchArticles, fetchArticlesByCategory, fetchArticlesByTag, activeFilter]);

  // Load data on component mount and when filter/page changes
  // Wait for basic data (categories/tags) to load first to avoid race conditions
  useEffect(() => {
    if (!isLoading) {
      loadArticles(currentPage);
    }
  }, [loadArticles, currentPage, activeFilter, isLoading]);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string) => {
    setActiveFilter(prev => {
      if (categoryId === 'all') {
        // Always allow selecting "All Articles"
        return { type: 'category', id: 'all' };
      } else if (prev.type === 'category' && prev.id === categoryId) {
        // If clicking the same category, go back to "All Articles"
        return { type: 'category', id: 'all' };
      } else {
        // Set new category filter
        return { type: 'category', id: categoryId };
      }
    });
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, []);

  // Handle tag selection
  const handleTagToggle = useCallback((tagId: string) => {
    setActiveFilter(prev => {
      if (prev.type === 'tag' && prev.id === tagId) {
        // If clicking the same tag, go back to "All Articles"
        return { type: 'category', id: 'all' };
      } else {
        // Set new tag filter
        return { type: 'tag', id: tagId };
      }
    });
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, []);

  // Calculate pagination
  const totalPages = useMemo(() => {
    return Math.ceil(totalArticles / ARTICLES_PER_PAGE);
  }, [totalArticles]);

  // Handle article click
  const handleArticleClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setActiveFilter({ type: 'category', id: 'all' });
  }, []);

  if (isLoading) {
    return (
      <div className="articles-page">
        <LoadingSpinner
          size="large"
          message="Loading articles..."
          className="articles-loading"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="articles-page">
        <ErrorMessage
          title="Error Loading Articles"
          message={error}
          onRetry={() => {
            loadArticles(currentPage);
          }}
        />
      </div>
    );
  }



  return (
    <div className="articles-page">
      {/* Page Header */}
      <header className="articles-header">
        <div className="articles-header-content">
          <h1 className="articles-title md-typescale-display-small">All Articles</h1>
          <p className="articles-subtitle md-typescale-body-large">
            Discover our latest articles and insights
          </p>
        </div>
      </header>

      {/* Filters Section */}
      <section className="articles-filters">
        {/* Category Filter */}
        <div className="filter-group">
          <h3 className="filter-title">Categories</h3>
          <div className="category-chips">
            {categories.map((category) => {
              const isSelected = activeFilter.type === 'category' && activeFilter.id === category.id;
              return (
                <md-filter-chip
                  key={category.id}
                  label={`${category.name} (${category.count})`}
                  {...(isSelected ? { selected: true } : {})}
                  data-category-id={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <md-icon slot="icon">{category.icon}</md-icon>
                </md-filter-chip>
              );
            })}
          </div>
        </div>

        {/* Tags Filter */}
        <div className="filter-group">
          <h3 className="filter-title">Tags</h3>
          <div className="tag-chips">
            {tags.map((tag) => {
              const isSelected = activeFilter.type === 'tag' && activeFilter.id === tag.id;
              return (
                <md-filter-chip
                  key={tag.id}
                  label={`${tag.name} (${tag.count})`}
                  {...(isSelected ? { selected: true } : {})}
                  data-tag-id={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                >
                  <md-icon slot="icon">local_offer</md-icon>
                </md-filter-chip>
              );
            })}
          </div>
        </div>

        {/* Clear Filters */}
        {activeFilter.id !== 'all' && (
          <div className="filter-actions">
            <md-text-button onClick={clearFilters}>
              <md-icon slot="icon">clear</md-icon>
              Clear Filter
            </md-text-button>
          </div>
        )}

        {/* Results Count */}
        <div className="filter-results">
          <p className="results-count md-typescale-body-medium">
            Showing {Math.min(currentPage * ARTICLES_PER_PAGE, totalArticles)} of {totalArticles} articles
            {activeFilter.id !== 'all' && ' (filtered)'}
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="articles-content">
        {articles.length > 0 ? (
          <div className="articles-grid">
            {articles.map((article) => (
                <div
                  key={article.id}
                  className="secondary-article-card"
                  onClick={() => handleArticleClick(article.id)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleArticleClick(article.id);
                    }
                  }}
                >
                  {/* 上方图片区域 */}
                  <div className="secondary-article-image">
                    <div className="secondary-article-visual-content">
                      {article.imageUrl ? (
                        <img
                          src={article.imageUrl.startsWith('http') ? article.imageUrl : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006'}${article.imageUrl}`}
                          alt={article.title}
                          className="secondary-article-cover-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="visual-placeholder" style={{ background: `linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)` }}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 下方内容区域 */}
                  <div className="secondary-article-content">
                    <div className="secondary-article-meta">
                      <span className="secondary-article-tag">{article.category}</span>
                      <span className="secondary-article-date">{new Date(article.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <h3 className="secondary-article-title">{article.title}</h3>
                    <p className="secondary-article-description">{article.excerpt}</p>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="no-articles">
            <md-icon className="no-articles-icon">article</md-icon>
            <h3 className="md-typescale-headline-small">No Articles Found</h3>
            <p className="md-typescale-body-medium">
              No articles are available at the moment.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="articles-pagination">
            <div className="pagination-controls">
              {/* Previous Button */}
              <md-icon-button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="pagination-button"
              >
                <md-icon>chevron_left</md-icon>
              </md-icon-button>

              {/* Page Numbers */}
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1;
                  const isCurrentPage = pageNumber === currentPage;

                  // Show first page, last page, current page, and pages around current page
                  const showPage =
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    Math.abs(pageNumber - currentPage) <= 1;

                  if (!showPage) {
                    // Show ellipsis for gaps
                    if (pageNumber === 2 && currentPage > 4) {
                      return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                    }
                    if (pageNumber === totalPages - 1 && currentPage < totalPages - 3) {
                      return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                    }
                    return null;
                  }

                  return (
                    <md-text-button
                      key={pageNumber}
                      className={`pagination-number ${isCurrentPage ? 'current' : ''}`}
                      onClick={() => handlePageChange(pageNumber)}
                      {...(isCurrentPage ? { disabled: true } : {})}
                    >
                      {pageNumber}
                    </md-text-button>
                  );
                })}
              </div>

              {/* Next Button */}
              <md-icon-button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="pagination-button"
              >
                <md-icon>chevron_right</md-icon>
              </md-icon-button>
            </div>

            {/* Page Info */}
            <div className="pagination-info">
              <span className="md-typescale-body-small">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ArticlesPage;
