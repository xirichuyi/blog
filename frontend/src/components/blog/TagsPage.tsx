import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Tag, Article } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';
import ArticleCard from './ArticleCard';
import './TagsPage.css';

const TagsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiService.getPublicTags();
        if (response.success && response.data) {
          setTags(response.data);
        } else {
          setError(response.error || 'Failed to fetch tags');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tags');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  // Load articles by tag
  const loadArticlesByTag = async (tagId: string) => {
    setIsLoadingArticles(true);
    setError(null);
    
    try {
      const response = await apiService.getPostsByTag(tagId);
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

  // Handle tag selection
  const handleTagSelect = async (tagId: string) => {
    if (tagId === selectedTag) {
      // Deselect tag
      setSelectedTag(null);
      setArticles([]);
      return;
    }
    
    setSelectedTag(tagId);
    await loadArticlesByTag(tagId);
  };

  // Handle article click
  const handleArticleClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

  // Filter tags based on search query
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get tag size class based on count
  const getTagSizeClass = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 'tag-size-xl';
    if (ratio >= 0.6) return 'tag-size-lg';
    if (ratio >= 0.4) return 'tag-size-md';
    if (ratio >= 0.2) return 'tag-size-sm';
    return 'tag-size-xs';
  };

  const maxTagCount = Math.max(...tags.map(tag => tag.count), 1);
  const selectedTagData = tags.find(tag => tag.id === selectedTag);

  if (isLoading) {
    return (
      <div className="tags-page">
        <LoadingSpinner
          size="large"
          message="Loading tags..."
          className="tags-loading"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tags-page">
        <div className="tags-error">
          <md-icon className="error-icon">error</md-icon>
          <h2 className="md-typescale-headline-medium">Error Loading Tags</h2>
          <p className="md-typescale-body-large">{error}</p>
          <md-filled-button onClick={() => window.location.reload()}>
            Try Again
          </md-filled-button>
        </div>
      </div>
    );
  }

  return (
    <div className="tags-page">
      {/* Page Header */}
      <header className="tags-header">
        <div className="tags-header-content">
          <h1 className="tags-title md-typescale-display-small">
            Explore by Tags
          </h1>
          <p className="tags-subtitle md-typescale-body-large">
            Discover articles through topics and keywords
          </p>
        </div>
      </header>

      {/* Search and Stats */}
      <section className="tags-controls">
        <div className="tags-search">
          <md-outlined-text-field
            label="Search tags..."
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
            class="tags-search-field"
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
        </div>
        
        <div className="tags-stats">
          <md-assist-chip className="stats-chip">
            <md-icon slot="icon">local_offer</md-icon>
            {filteredTags.length} tags
          </md-assist-chip>
          {selectedTag && selectedTagData && (
            <md-assist-chip className="selected-chip">
              <md-icon slot="icon">check_circle</md-icon>
              {selectedTagData.name} ({selectedTagData.count})
            </md-assist-chip>
          )}
        </div>
      </section>

      {/* Tags Cloud */}
      <section className="tags-section">
        <h2 className="section-title md-typescale-headline-medium">Tag Cloud</h2>
        {filteredTags.length > 0 ? (
          <div className="tags-cloud">
            {filteredTags.map((tag) => (
              <md-filter-chip
                key={tag.id}
                className={`tag-chip ${getTagSizeClass(tag.count, maxTagCount)} ${
                  selectedTag === tag.id ? 'selected' : ''
                }`}
                selected={selectedTag === tag.id}
                onClick={() => handleTagSelect(tag.id)}
              >
                {tag.name}
                <span className="tag-count">({tag.count})</span>
              </md-filter-chip>
            ))}
          </div>
        ) : (
          <div className="no-tags">
            <md-icon className="no-tags-icon">local_offer</md-icon>
            <p className="md-typescale-body-medium">
              No tags found matching "{searchQuery}"
            </p>
          </div>
        )}
      </section>

      {/* Articles Section */}
      {selectedTag && (
        <section className="articles-section">
          <div className="articles-header">
            <h2 className="section-title md-typescale-headline-medium">
              Articles tagged with "{selectedTagData?.name}"
            </h2>
            <md-text-button
              onClick={() => handleTagSelect(selectedTag)}
              className="clear-selection-btn"
            >
              <md-icon slot="icon">close</md-icon>
              Clear Selection
            </md-text-button>
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
                  className="tag-article-card"
                />
              ))}
            </div>
          ) : (
            <div className="no-articles">
              <md-icon className="no-articles-icon">article</md-icon>
              <h3 className="md-typescale-headline-small">No Articles Found</h3>
              <p className="md-typescale-body-medium">
                There are no articles with this tag yet.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Help Text */}
      {!selectedTag && (
        <section className="tags-help">
          <div className="help-content">
            <md-icon className="help-icon">info</md-icon>
            <div className="help-text">
              <h3 className="md-typescale-title-medium">How to use tags</h3>
              <p className="md-typescale-body-medium">
                Click on any tag above to see all articles associated with that topic. 
                Tag sizes reflect how frequently they're used across articles.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default TagsPage;
