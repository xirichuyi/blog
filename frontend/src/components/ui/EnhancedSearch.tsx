import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Article } from '../../types';
import './EnhancedSearch.css';

interface SearchSuggestion {
  id: string;
  type: 'article' | 'category' | 'tag' | 'author';
  title: string;
  subtitle?: string;
  icon: string;
  url: string;
}

interface SearchHistory {
  query: string;
  timestamp: number;
  resultCount: number;
}

interface EnhancedSearchProps {
  placeholder?: string;
  maxSuggestions?: number;
  maxHistory?: number;
  showCategories?: boolean;
  showTags?: boolean;
  showAuthors?: boolean;
  onSearch?: (query: string, results: Article[]) => void;
  className?: string;
}

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  placeholder = 'Search articles, categories, tags...',
  maxSuggestions = 8,
  maxHistory = 5,
  showCategories = true,
  showTags = true,
  showAuthors = true,
  onSearch,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('search-history');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setSearchHistory(history.slice(0, maxHistory));
      } catch (err) {
        console.warn('Failed to load search history:', err);
      }
    }
  }, [maxHistory]);

  // Load all data for suggestions
  useEffect(() => {
    const loadData = async () => {
      try {
        const articlesResponse = await apiService.getPosts({ page_size: 12 });
        if (articlesResponse.success && articlesResponse.data) {
          setAllArticles(articlesResponse.data);

          const uniqueCategories = [...new Set(articlesResponse.data.map((a: any) => a.category))].filter(Boolean) as string[];
          const uniqueTags = [...new Set(articlesResponse.data.flatMap((a: any) => a.tags || []))].filter(Boolean) as string[];
          const uniqueAuthors = [...new Set(articlesResponse.data.map((a: any) => a.author))].filter(Boolean) as string[];

          setCategories(uniqueCategories);
          setTags(uniqueTags);
          setAuthors(uniqueAuthors);
        }
      } catch (err) {
        console.warn('Failed to load search data:', err);
      }
    };

    loadData();
  }, []);

  // Generate suggestions based on query
  const generateSuggestions = useMemo(() => {
    if (!query.trim()) {
      return searchHistory.map(item => ({
        id: `history-${item.query}`,
        type: 'article' as const,
        title: item.query,
        subtitle: `${item.resultCount} results`,
        icon: 'history',
        url: `/search?q=${encodeURIComponent(item.query)}`
      }));
    }

    const queryLower = query.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Article suggestions
    allArticles
      .filter(article =>
        article.title.toLowerCase().includes(queryLower) ||
        article.excerpt.toLowerCase().includes(queryLower)
      )
      .slice(0, 4)
      .forEach(article => {
        suggestions.push({
          id: `article-${article.id}`,
          type: 'article',
          title: article.title,
          subtitle: article.excerpt,
          icon: 'article',
          url: `/article/${article.id}`
        });
      });

    // Category suggestions
    if (showCategories) {
      categories
        .filter(category => category.toLowerCase().includes(queryLower))
        .slice(0, 2)
        .forEach(category => {
          suggestions.push({
            id: `category-${category}`,
            type: 'category',
            title: category,
            subtitle: 'Category',
            icon: 'category',
            url: `/categories?category=${encodeURIComponent(category)}`
          });
        });
    }

    // Tag suggestions
    if (showTags) {
      tags
        .filter(tag => tag.toLowerCase().includes(queryLower))
        .slice(0, 2)
        .forEach(tag => {
          suggestions.push({
            id: `tag-${tag}`,
            type: 'tag',
            title: tag,
            subtitle: 'Tag',
            icon: 'label',
            url: `/tags?tag=${encodeURIComponent(tag)}`
          });
        });
    }

    // Author suggestions
    if (showAuthors) {
      authors
        .filter(author => author.toLowerCase().includes(queryLower))
        .slice(0, 1)
        .forEach(author => {
          suggestions.push({
            id: `author-${author}`,
            type: 'author',
            title: author,
            subtitle: 'Author',
            icon: 'person',
            url: `/search?author=${encodeURIComponent(author)}`
          });
        });
    }

    return suggestions.slice(0, maxSuggestions);
  }, [query, allArticles, categories, tags, authors, searchHistory, maxSuggestions, showCategories, showTags, showAuthors]);

  // Update suggestions when query changes
  useEffect(() => {
    setSuggestions(generateSuggestions);
    setHighlightedIndex(-1);
  }, [generateSuggestions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
  };

  // Handle search submission
  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setIsOpen(false);

    try {
      const response = await apiService.getPosts({
        search: searchQuery,
        page_size: 50
      });

      if (response.success && response.data) {
        const newHistoryItem: SearchHistory = {
          query: searchQuery,
          timestamp: Date.now(),
          resultCount: response.data.length
        };

        const updatedHistory = [
          newHistoryItem,
          ...searchHistory.filter(item => item.query !== searchQuery)
        ].slice(0, maxHistory);

        setSearchHistory(updatedHistory);
        localStorage.setItem('search-history', JSON.stringify(updatedHistory));

        if (onSearch) {
          onSearch(searchQuery, response.data);
        } else {
          navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'article') {
      if (suggestion.id.startsWith('history-')) {
        const historyQuery = suggestion.title;
        setQuery(historyQuery);
        handleSearch(historyQuery);
      } else {
        navigate(suggestion.url);
      }
    } else {
      navigate(suggestion.url);
    }
    setIsOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : part
    );
  };

  return (
    <div ref={searchRef} className={`enhanced-search ${className}`}>
      <div className="search-input-container">
        <md-icon class="search-icon">search</md-icon>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="search-input"
          autoComplete="off"
        />
        {isLoading && (
          <md-circular-progress
            indeterminate
            class="search-loading"
          ></md-circular-progress>
        )}
        {query && (
          <md-icon-button
            class="search-clear"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
          >
            <md-icon>close</md-icon>
          </md-icon-button>
        )}
      </div>

      {isOpen && (
        <div className="search-dropdown">
          {suggestions.length > 0 ? (
            <div className="search-suggestions">
              {!query.trim() && searchHistory.length > 0 && (
                <div className="search-section-header">
                  <md-icon>history</md-icon>
                  <span>Recent searches</span>
                </div>
              )}
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`search-suggestion ${index === highlightedIndex ? 'highlighted' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <md-icon class={`suggestion-icon suggestion-${suggestion.type}`}>
                    {suggestion.icon}
                  </md-icon>
                  <div className="suggestion-content">
                    <div className="suggestion-title">
                      {highlightText(suggestion.title, query)}
                    </div>
                    {suggestion.subtitle && (
                      <div className="suggestion-subtitle">
                        {highlightText(suggestion.subtitle, query)}
                      </div>
                    )}
                  </div>
                  <md-icon class="suggestion-arrow">arrow_forward</md-icon>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="search-no-results">
              <md-icon>search_off</md-icon>
              <span>No suggestions found</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;
