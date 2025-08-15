import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useBlogData from '../../hooks/useBlogData';
import type { Article } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

import './ArticlesPage.css';

const ArticlesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    articles,
    categories,
    tags,
    isLoading,
    error,
    fetchArticles,
    fetchCategories,
    fetchTags
  } = useBlogData();

  // Filter states
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);

  // Active filter state - only one filter can be active at a time
  const [activeFilter, setActiveFilter] = useState<{type: 'category' | 'tag' | null, id: string | null}>({
    type: 'category',
    id: 'all'
  });

  // Load data on component mount
  useEffect(() => {
    fetchArticles();
    fetchCategories();
    fetchTags();
  }, [fetchArticles, fetchCategories, fetchTags]);

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
  }, []);



  // Filter articles based on active filter
  useEffect(() => {
    let filtered = [...articles];

    // Apply active filter
    if (activeFilter.type === 'category' && activeFilter.id !== 'all') {
      filtered = filtered.filter(article =>
        article.category.toLowerCase().replace(/\s+/g, '-') === activeFilter.id
      );
    } else if (activeFilter.type === 'tag' && activeFilter.id) {
      filtered = filtered.filter(article =>
        article.tags.some(tag =>
          tag.toLowerCase().replace(/\s+/g, '-') === activeFilter.id
        )
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

    setFilteredArticles(filtered);
  }, [articles, activeFilter]);

  // Handle article click
  const handleArticleClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };



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
        <div className="articles-error">
          <md-icon className="error-icon">error</md-icon>
          <h2 className="md-typescale-headline-medium">Error Loading Articles</h2>
          <p className="md-typescale-body-large">{error}</p>
          <md-filled-button onClick={() => window.location.reload()}>
            Try Again
          </md-filled-button>
        </div>
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
            Showing {filteredArticles.length} of {articles.length} articles
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="articles-content">
        {filteredArticles.length > 0 ? (
          <div className="articles-grid">
            {filteredArticles.map((article) => (
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
                  <div className="secondary-article-image" style={{ background: `linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)` }}>
                    <div className="secondary-article-visual-content">
                      <div className="visual-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
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
      </section>
    </div>
  );
};

export default ArticlesPage;
