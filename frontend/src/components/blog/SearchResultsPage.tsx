import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useBlogData from '../../hooks/useBlogData';
import type { Article } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';
import ArticleCard from './ArticleCard';
import './SearchResultsPage.css';

// Simplified search without complex filters

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { articles, categories, isLoading, error, fetchArticles, fetchCategories } = useBlogData();
  
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isSearching, setIsSearching] = useState(false);

  // Load data on component mount
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Perform search when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, articles]);

  // Update URL when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
    } else {
      setSearchParams({});
    }
  }, [searchQuery, setSearchParams]);

  const performSearch = async () => {
    setIsSearching(true);

    try {
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 300));

      let results = [...articles];
      const query = searchQuery.toLowerCase().trim();

      if (query) {
        // Simple search in title, excerpt, author, tags, and category
        results = results.filter(article => {
          const titleMatch = article.title.toLowerCase().includes(query);
          const excerptMatch = article.excerpt.toLowerCase().includes(query);
          const authorMatch = article.author.toLowerCase().includes(query);
          const categoryMatch = article.category.toLowerCase().includes(query);
          const tagsMatch = article.tags.some(tag => tag.toLowerCase().includes(query));

          return titleMatch || excerptMatch || authorMatch || categoryMatch || tagsMatch;
        });

        // Sort by date (newest first)
        results.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

// Removed complex filter handling

  const handleArticleClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : part
    );
  };

  if (isLoading) {
    return (
      <div className="search-results-page">
        <LoadingSpinner
          size="large"
          message="Loading..."
          className="search-loading"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results-page">
        <div className="search-error">
          <md-icon className="error-icon">error</md-icon>
          <h2 className="md-typescale-headline-medium">Search Error</h2>
          <p className="md-typescale-body-large">{error}</p>
          <md-filled-button onClick={() => window.location.reload()}>
            Try Again
          </md-filled-button>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-page">
      {/* Search Header */}
      <header className="search-header">
        <h1 className="search-title md-typescale-display-small">Search Results</h1>
        
        {/* Search Form */}
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <md-outlined-text-field
            label="Search articles..."
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
            class="search-input"
          >
            <md-icon slot="leading-icon">search</md-icon>
            {searchQuery && (
              <md-icon-button
                slot="trailing-icon"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <md-icon>close</md-icon>
              </md-icon-button>
            )}
          </md-outlined-text-field>
          
          <md-filled-button type="submit" disabled={isSearching}>
            {isSearching ? (
              <>
                <md-circular-progress indeterminate slot="icon" style="--md-circular-progress-size: 18px"></md-circular-progress>
                Searching...
              </>
            ) : (
              <>
                <md-icon slot="icon">search</md-icon>
                Search
              </>
            )}
          </md-filled-button>
        </form>

      </header>

      {/* Search Results */}
      <section className="search-results">
        {searchQuery.trim() ? (
          <>
            <div className="results-info">
              <p className="results-count md-typescale-body-medium">
                {isSearching ? 'Searching...' : `Found ${searchResults.length} results for "${searchQuery}"`}
              </p>
            </div>

            {searchResults.length > 0 ? (
              <div className="results-grid">
                {searchResults.map((article) => (
                  <div key={article.id} className="search-result-card">
                    <ArticleCard
                      {...article}
                      onClick={handleArticleClick}
                      className="search-article-card"
                    />
                    <div className="search-snippet">
                      <p className="snippet-text md-typescale-body-small">
                        {highlightText(article.excerpt, searchQuery)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isSearching ? (
              <div className="no-results">
                <md-icon className="no-results-icon">search_off</md-icon>
                <h3 className="md-typescale-headline-small">No Results Found</h3>
                <p className="md-typescale-body-medium">
                  No articles found matching "{searchQuery}". Try different keywords or adjust your filters.
                </p>
                <md-text-button onClick={() => setSearchQuery('')}>
                  <md-icon slot="icon">refresh</md-icon>
                  Clear Search
                </md-text-button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="search-prompt">
            <md-icon className="search-prompt-icon">search</md-icon>
            <h3 className="md-typescale-headline-small">Start Your Search</h3>
            <p className="md-typescale-body-medium">
              Enter keywords to search through articles, authors, categories, and tags.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default SearchResultsPage;
