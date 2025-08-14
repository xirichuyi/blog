import React, { useState, useRef, useEffect } from 'react';
import './EnhancedSearch.css';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'suggestion' | 'category';
  icon?: string;
}

interface EnhancedSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  suggestions?: SearchSuggestion[];
  className?: string;
}

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  placeholder = "Search articles...",
  onSearch,
  onSuggestionSelect,
  suggestions = [],
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const defaultSuggestions: SearchSuggestion[] = [
    { id: '1', text: 'React hooks', type: 'recent', icon: 'history' },
    { id: '2', text: 'TypeScript', type: 'recent', icon: 'history' },
    { id: '3', text: 'Material Design', type: 'suggestion', icon: 'search' },
    { id: '4', text: 'Web Development', type: 'category', icon: 'category' },
    { id: '5', text: 'JavaScript', type: 'suggestion', icon: 'search' },
  ];

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;
  const filteredSuggestions = displaySuggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 0 || true);
    setFocusedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSuggestionClick(filteredSuggestions[focusedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query.trim());
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
    setFocusedIndex(-1);
    onSuggestionSelect?.(suggestion);
  };

  const getSuggestionTypeLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent': return 'Recent search';
      case 'suggestion': return 'Suggestion';
      case 'category': return 'Category';
      default: return '';
    }
  };

  return (
    <div ref={containerRef} className={`enhanced-search ${className}`}>
      <div className="enhanced-search-field">
        <md-outlined-text-field
          ref={inputRef}
          className="enhanced-search-input"
          placeholder={placeholder}
          value={query}
          onInput={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          type="search"
        >
          <md-icon slot="leading-icon">search</md-icon>
          {query && (
            <md-icon-button
              slot="trailing-icon"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <md-icon>close</md-icon>
            </md-icon-button>
          )}
        </md-outlined-text-field>
      </div>

      {isOpen && (
        <div className="enhanced-search-dropdown">
          <md-elevated-card className="enhanced-search-suggestions">
            {filteredSuggestions.length > 0 ? (
              <>
                <div className="enhanced-search-header">
                  <span className="md-typescale-title-small">Suggestions</span>
                </div>
                <md-list>
                  {filteredSuggestions.map((suggestion, index) => (
                    <md-list-item
                      key={suggestion.id}
                      type="button"
                      className={`enhanced-search-suggestion ${
                        index === focusedIndex ? 'focused' : ''
                      }`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <md-icon slot="start">{suggestion.icon}</md-icon>
                      <div slot="headline">{suggestion.text}</div>
                      <div slot="supporting-text">{getSuggestionTypeLabel(suggestion.type)}</div>
                    </md-list-item>
                  ))}
                </md-list>
              </>
            ) : (
              <div className="enhanced-search-no-results">
                <md-icon>search_off</md-icon>
                <span className="md-typescale-body-medium">No suggestions found</span>
              </div>
            )}
          </md-elevated-card>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;
