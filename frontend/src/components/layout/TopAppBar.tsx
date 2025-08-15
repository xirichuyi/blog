import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import EnhancedSearch from '../ui/EnhancedSearch';
import useResponsive from '../../hooks/useResponsive';
import './TopAppBar.css';

interface TopAppBarProps {
  title?: string;
  showSearch?: boolean;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  className?: string;
}

const TopAppBar: React.FC<TopAppBarProps> = ({
  title = "Cyrus Blog",
  showSearch = true,
  onMenuClick,
  onSearchClick,
  className = ""
}) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isMobile, isTablet } = useResponsive();

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (onSearchClick) {
      onSearchClick();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleSearchFromEnhanced = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      
      <header className={`top-app-bar surface-container ${className}`}>
        <div className="top-app-bar-content">
          {/* Leading Section */}
          <div className="top-app-bar-leading">
            <md-icon-button 
              className="menu-button"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
            >
              <md-icon>menu</md-icon>
            </md-icon-button>
            
            <div className="app-title">
              <h1 className="md-typescale-title-large">{title}</h1>
            </div>
          </div>

          {/* Trailing Section */}
          <div className="top-app-bar-trailing">
            {showSearch && (
              <div className={`search-container ${isSearchOpen ? 'search-expanded' : ''}`}>
                {isSearchOpen ? (
                  <EnhancedSearch
                    placeholder="Search articles..."
                    onSearch={handleSearchFromEnhanced}
                    className="top-app-bar-search"
                  />
                ) : (
                  <md-icon-button
                    onClick={handleSearchToggle}
                    aria-label="Open search"
                  >
                    <md-icon>search</md-icon>
                  </md-icon-button>
                )}
              </div>
            )}

            <ThemeToggle size={isMobile ? 'small' : 'medium'} />

            {!isMobile && (
              <div className="top-app-bar-badge-container">
                <md-icon-button aria-label="More options">
                  <md-icon>more_vert</md-icon>
                </md-icon-button>
                <md-badge value="3"></md-badge>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default TopAppBar;
