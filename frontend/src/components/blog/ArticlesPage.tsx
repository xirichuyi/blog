import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useBlogData from '../../hooks/useBlogData';
import type { Article } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

import './ArticlesPage.css';

const ArticlesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { articles, categories, isLoading, error, fetchArticles, fetchCategories } = useBlogData();
  
// Simplified - no filtering needed

  // Load data on component mount
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Handle article click
  const handleArticleClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

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



      {/* Articles Grid */}
      <section className="articles-content">
        {articles.length > 0 ? (
          <div className="articles-grid">
            {articles
              .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
              .map((article) => (
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
