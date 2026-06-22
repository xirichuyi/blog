import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import './MobileHome.css';
import MobileArticleCard from '../../components/ui/ArticleCard/MobileArticleCard';
import { apiService } from '../../services/api';
import type { Article } from '../../services/types';
import { logger } from '../../utils/logger';

const MobileHome: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gradients
  const gradients = useMemo(() => [
    "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)",
    "linear-gradient(135deg, #B8C5D1 0%, #D6E3F0 100%)",
    "linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)",
    "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
    "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",
    "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
    "linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)"
  ], []);

  // Load articles
  const loadArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getArticles({
        page: 1,
        page_size: 7,
        status: 'published'
      });

      if (response.success && response.data) {
        setArticles(response.data);
      }
    } catch (error) {
      logger.error('Error loading articles:', error);
      setError(error instanceof Error ? error.message : 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const getGradientForIndex = useCallback((index: number): string => {
    return gradients[index % gradients.length];
  }, [gradients]);

  const convertArticleToDisplayFormat = useCallback((article: Article, index: number) => {
    // Clean description text
    let description = article.excerpt || '';
    if (!description && article.content) {
      description = article.content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/[#*_\[\]()]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 120);
    }
    
    return {
      id: article.id,
      title: article.title,
      description: description ? description + '...' : 'No description available',
      date: new Date(article.publishDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      tag: article.category || 'Article',
      coverImage: article.coverImage || article.imageUrl,
      gradient: getGradientForIndex(index)
    };
  }, [getGradientForIndex]);

  const handleArticleClick = useCallback((articleId: string) => {
    navigate(`/article/${articleId}`);
  }, [navigate]);

  const handleSeeMore = useCallback(() => {
    navigate('/articles');
  }, [navigate]);

  const displayArticles = useMemo(() =>
    articles.map((article, index) =>
      convertArticleToDisplayFormat(article, index)
    ), [articles, convertArticleToDisplayFormat]
  );

  if (isLoading && articles.length === 0) {
    return (
      <div className="mobile-home">
        <div className="mobile-home-loading">
          <Loader2 className="loading-spinner" size={32} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-home">
        <div className="mobile-home-error">
          <AlertCircle className="error-icon" size={48} />
          <p>{error}</p>
          <button className="apple-button-base apple-button-primary" onClick={loadArticles}>
            <RefreshCw size={18} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-home">
      {/* Header - Clean Apple Style */}
      <div className="mobile-section-header">
        <h1 className="mobile-section-title">Latest Articles</h1>
      </div>

      {/* Articles List */}
      <div className="mobile-articles-list">
        {displayArticles.map((article) => (
          <MobileArticleCard
            key={article.id}
            id={article.id}
            title={article.title}
            description={article.description}
            date={article.date}
            tag={article.tag}
            coverImage={article.coverImage}
            gradient={article.gradient}
            onClick={handleArticleClick}
          />
        ))}
      </div>

      {/* See More Button */}
      <div className="mobile-see-more-section">
        <button 
          className="apple-button-base apple-button-outline mobile-see-more-button"
          onClick={handleSeeMore}
        >
          See More Articles
        </button>
      </div>
    </div>
  );
};

export default MobileHome;
