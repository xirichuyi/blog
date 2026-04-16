import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Article } from '../../services/types';
import { logger } from '../../utils/logger';
import './Search.css';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;

    const search = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getArticles({
          search: query,
          status: 'published',
          page_size: 50,
        });
        if (response.success && response.data) {
          setResults(response.data);
        }
      } catch (err) {
        logger.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [query]);

  if (!query.trim()) {
    return (
      <div className="search-page">
        <div className="search-empty">
          <md-icon>search</md-icon>
          <p>Please enter a search keyword</p>
        </div>
      </div>
    );
  }

  return (
    <div className="search-page">
      <header className="search-header">
        <h1>Search Results</h1>
        <p className="search-query">
          Found {results.length} articles for "<strong>{query}</strong>"
        </p>
      </header>

      {isLoading ? (
        <div className="search-loading">
          <md-circular-progress indeterminate></md-circular-progress>
          <p>Searching...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="search-results-list">
          {results.map((article) => (
            <article
              key={article.id}
              className="search-result-item"
              onClick={() => navigate(`/article/${article.id}`)}
            >
              <h2 className="result-title">{article.title}</h2>
              <p className="result-excerpt">{article.excerpt}</p>
              <div className="result-meta">
                <span className="result-category">{article.category}</span>
                <span className="result-date">
                  {new Date(article.publishDate).toLocaleDateString('en-US')}
                </span>
                {article.tags.length > 0 && (
                  <span className="result-tags">
                    {article.tags.slice(0, 3).join(' · ')}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="search-empty">
          <md-icon>search_off</md-icon>
          <p>No articles found for "{query}"</p>
          <md-outlined-button onClick={() => navigate('/articles')}>
            <md-icon slot="icon">arrow_back</md-icon>
            Browse all articles
          </md-outlined-button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
