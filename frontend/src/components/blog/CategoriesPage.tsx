import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Category, Article } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';
import ArticleCard from './ArticleCard';
import './CategoriesPage.css';

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiService.getPublicCategories();
        if (response.success && response.data) {
          setCategories(response.data);
          // Load all articles initially
          await loadArticlesByCategory('all');
        } else {
          setError(response.error || 'Failed to fetch categories');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Load articles by category
  const loadArticlesByCategory = async (categoryId: string) => {
    setIsLoadingArticles(true);
    setError(null);
    
    try {
      const response = await apiService.getPostsByCategory(categoryId);
      if (response.success && response.data) {
        setArticles(response.data);
      } else {
        setError(response.error || 'Failed to fetch articles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setIsLoadingArticles(false);
    }
  };

  // Handle category selection
  const handleCategorySelect = async (categoryId: string) => {
    if (categoryId === selectedCategory) return;
    
    setSelectedCategory(categoryId);
    await loadArticlesByCategory(categoryId);
  };

  // Handle article click
  const handleArticleClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

  if (isLoading) {
    return (
      <div className="categories-page">
        <LoadingSpinner
          size="large"
          message="Loading categories..."
          className="categories-loading"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="categories-page">
        <div className="categories-error">
          <md-icon className="error-icon">error</md-icon>
          <h2 className="md-typescale-headline-medium">Error Loading Categories</h2>
          <p className="md-typescale-body-large">{error}</p>
          <md-filled-button onClick={() => window.location.reload()}>
            Try Again
          </md-filled-button>
        </div>
      </div>
    );
  }

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="categories-page">
      {/* Page Header */}
      <header className="categories-header">
        <div className="categories-header-content">
          <h1 className="categories-title md-typescale-display-small">
            Browse by Categories
          </h1>
          <p className="categories-subtitle md-typescale-body-large">
            Explore articles organized by topics and themes
          </p>
        </div>
      </header>

      {/* Categories Grid */}
      <section className="categories-section">
        <h2 className="section-title md-typescale-headline-medium">Categories</h2>
        <div className="categories-grid">
          {categories.map((category) => (
            <md-elevated-card
              key={category.id}
              className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <div className="category-card-content">
                <div className="category-icon-container">
                  <md-icon className="category-icon">{category.icon}</md-icon>
                </div>
                <div className="category-info">
                  <h3 className="category-name md-typescale-title-large">
                    {category.name}
                  </h3>
                  <p className="category-count md-typescale-body-medium">
                    {category.count} {category.count === 1 ? 'article' : 'articles'}
                  </p>
                </div>
                {selectedCategory === category.id && (
                  <md-icon className="selected-indicator">check_circle</md-icon>
                )}
              </div>
            </md-elevated-card>
          ))}
        </div>
      </section>

      {/* Articles Section */}
      <section className="articles-section">
        <div className="articles-header">
          <h2 className="section-title md-typescale-headline-medium">
            {selectedCategoryData ? selectedCategoryData.name : 'Articles'}
          </h2>
          {selectedCategoryData && selectedCategoryData.id !== 'all' && (
            <md-assist-chip className="category-chip">
              <md-icon slot="icon">{selectedCategoryData.icon}</md-icon>
              {selectedCategoryData.count} articles
            </md-assist-chip>
          )}
        </div>

        {isLoadingArticles ? (
          <LoadingSpinner
            size="medium"
            message="Loading articles..."
            className="articles-loading"
          />
        ) : articles.length > 0 ? (
          <div className="articles-grid">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                {...article}
                onClick={handleArticleClick}
                className="category-article-card"
              />
            ))}
          </div>
        ) : (
          <div className="no-articles">
            <md-icon className="no-articles-icon">article</md-icon>
            <h3 className="md-typescale-headline-small">No Articles Found</h3>
            <p className="md-typescale-body-medium">
              There are no articles in this category yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default CategoriesPage;
