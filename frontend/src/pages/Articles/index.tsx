import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api'
import type { Article, Category, Tag, PaginationInfo } from '../../services/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { useDebouncedClick } from '../../hooks/useDebounce';
import { globalOperationLock } from '../../utils/smoothTransitions';

import './style.css';

// 分页常量
const ARTICLES_PER_PAGE = 12;

const Articles: React.FC = () => {
    const navigate = useNavigate();

    // Data states
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [totalArticles, setTotalArticles] = useState(0);

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [articlesLoading, setArticlesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Active filter state - only one filter can be active at a time
    const [activeFilter, setActiveFilter] = useState<{ type: 'category' | 'tag' | null, id: string | null }>({
        type: 'category',
        id: 'all'
    });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);

    // Load articles based on current filter
    const loadArticles = useCallback(async (page: number = 1) => {
        try {
            setArticlesLoading(true);
            setError(null);

            if (activeFilter.type === 'category' && activeFilter.id !== 'all' && activeFilter.id) {
                // Load articles by category
                const response = await apiService.getArticles({
                    category: activeFilter.id,
                    status: 'published'
                });
                if (response.success && response.data) {
                    const categoryArticles = response.data;
                    // Handle pagination locally for category filtering
                    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
                    const endIndex = startIndex + ARTICLES_PER_PAGE;
                    setArticles(categoryArticles.slice(startIndex, endIndex));
                    setTotalArticles(categoryArticles.length);
                }
            } else if (activeFilter.type === 'tag' && activeFilter.id) {
                // Load articles by tag
                const response = await apiService.getArticles({
                    tag_id: Number(activeFilter.id),
                    status: 'published'
                });
                if (response.success && response.data) {
                    const tagArticles = response.data;
                    // Handle pagination locally for tag filtering
                    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
                    const endIndex = startIndex + ARTICLES_PER_PAGE;
                    setArticles(tagArticles.slice(startIndex, endIndex));
                    setTotalArticles(tagArticles.length);
                }
            } else {
                // Load all articles with server-side pagination
                const response = await apiService.getArticles({
                    page,
                    page_size: ARTICLES_PER_PAGE,
                    status: 'published'
                });
                if (response.success && response.data) {
                    setArticles(response.data);
                    setTotalArticles(response.total || response.data.length);
                }
            }
        } catch (error) {
            console.error('Error loading articles:', error);
            setError(error instanceof Error ? error.message : 'Failed to load articles');
        } finally {
            setArticlesLoading(false);
        }
    }, [activeFilter]);

    // Load basic data (categories and tags)
    const loadBasicData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const [categoriesResponse, tagsResponse] = await Promise.all([
                apiService.getCategories(),
                apiService.getTags()
            ]);

            if (categoriesResponse.success && categoriesResponse.data) {
                setCategories(categoriesResponse.data);
            }
            if (tagsResponse.success && tagsResponse.data) {
                setTags(tagsResponse.data);
            }
        } catch (error) {
            console.error('Error loading basic data:', error);
            setError(error instanceof Error ? error.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load basic data on mount
    useEffect(() => {
        loadBasicData();
    }, [loadBasicData]);

    // Load initial articles and when filter changes
    useEffect(() => {
        if (!isLoading) { // Only load articles after basic data is loaded
            loadArticles(currentPage);
        }
    }, [loadArticles, currentPage, isLoading]);

    // Reset to page 1 when filter changes
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            loadArticles(1);
        }
    }, [activeFilter]);

    // Handle category filter with debounce to prevent rapid clicking
    const handleCategoryFilterInternal = useCallback(async (categoryId: string) => {
        // 使用操作锁防止快速连续点击
        await globalOperationLock.withLock('category-filter', async () => {
            // 添加短暂延迟，让用户看到点击反馈
            await new Promise(resolve => setTimeout(resolve, 100));
            setActiveFilter({ type: 'category', id: categoryId });
        });
    }, []);

    const [handleCategoryFilter, isCategoryProcessing] = useDebouncedClick(handleCategoryFilterInternal, 200);

    // Handle tag filter with debounce
    const handleTagFilterInternal = useCallback(async (tagId: string) => {
        await globalOperationLock.withLock('tag-filter', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            setActiveFilter({ type: 'tag', id: tagId });
        });
    }, []);

    const [handleTagFilter, isTagProcessing] = useDebouncedClick(handleTagFilterInternal, 200);

    // Handle article click
    const handleArticleClick = (articleId: string) => {
        navigate(`/article/${articleId}`);
    };

    // Pagination calculations
    const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    // Get active filter display name
    const getActiveFilterName = () => {
        if (activeFilter.type === 'category' && activeFilter.id !== 'all') {
            const category = categories.find(c => c.id === activeFilter.id);
            return category ? category.name : 'Unknown Category';
        } else if (activeFilter.type === 'tag' && activeFilter.id) {
            const tag = tags.find(t => t.id === activeFilter.id);
            return tag ? tag.name : 'Unknown Tag';
        }
        return 'All Articles';
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Show loading state - 只在初始加载时显示全屏加载
    if (isLoading) {
        return (
            <div className="articles-page">
                <div className="articles-loading">
                    <LoadingSpinner />
                    <p>Loading articles...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="articles-page">
                <ErrorMessage message={error || 'Failed to load articles'} />
            </div>
        );
    }

    return (
        <div className="articles-page">
            {/* Header */}
            <div className="articles-header">
                <h1 className="articles-title">Articles</h1>
                <p className="articles-subtitle">
                    Discover insights, tutorials, and thoughts on web development and technology
                </p>
            </div>

            {/* Filters */}
            <div className="articles-filters">
                {/* Category Filters */}
                <div className="filter-section">
                    <h3 className="filter-title">Categories</h3>
                    <div className="filter-chips">
                        <md-filter-chip
                            selected={activeFilter.type === 'category' && activeFilter.id === 'all'}
                            onClick={() => handleCategoryFilter('all')}
                        >
                            All
                        </md-filter-chip>
                        {categories.map((category) => (
                            <md-filter-chip
                                key={category.id}
                                selected={activeFilter.type === 'category' && activeFilter.id === category.id}
                                onClick={() => handleCategoryFilter(category.id)}
                            >
                                {category.name}
                            </md-filter-chip>
                        ))}
                    </div>
                </div>

                {/* Tag Filters */}
                <div className="filter-section">
                    <h3 className="filter-title">Tags</h3>
                    <div className="filter-chips">
                        {tags.slice(0, 10).map((tag) => (
                            <md-filter-chip
                                key={tag.id}
                                selected={activeFilter.type === 'tag' && activeFilter.id === tag.id}
                                onClick={() => handleTagFilter(tag.id)}
                            >
                                {tag.name}
                            </md-filter-chip>
                        ))}
                    </div>
                </div>
            </div>

            {/* Active Filter Display */}
            <div className="active-filter">
                <div className="active-filter-content">
                    <span className="active-filter-label">Showing:</span>
                    <span className="active-filter-name">{getActiveFilterName()}</span>
                    <span className="active-filter-count">({totalArticles} articles)</span>
                    {activeFilter.id !== 'all' && (
                        <md-text-button
                            onClick={() => setActiveFilter({ type: 'category', id: 'all' })}
                            className="clear-filter-btn"
                        >
                            <md-icon slot="icon">clear</md-icon>
                            Clear Filter
                        </md-text-button>
                    )}
                </div>
            </div>

            {/* Articles Grid */}
            <div className={`articles-grid ${articlesLoading ? 'articles-grid--loading' : ''}`}>
                {articlesLoading ? (
                    // 显示骨架屏而不是完全隐藏内容
                    <>
                        {Array.from({ length: 6 }, (_, index) => (
                            <div key={`skeleton-${index}`} className="article-card article-card--skeleton">
                                <div className="article-image article-image--skeleton"></div>
                                <div className="article-content">
                                    <div className="article-meta">
                                        <div className="skeleton-line skeleton-line--category"></div>
                                        <div className="skeleton-line skeleton-line--date"></div>
                                    </div>
                                    <div className="skeleton-line skeleton-line--title"></div>
                                    <div className="skeleton-line skeleton-line--title skeleton-line--short"></div>
                                    <div className="skeleton-line skeleton-line--excerpt"></div>
                                    <div className="skeleton-line skeleton-line--excerpt skeleton-line--short"></div>
                                </div>
                            </div>
                        ))}
                    </>
                ) : articles.length === 0 ? (
                    <div className="no-articles">
                        <md-icon className="no-articles-icon">article</md-icon>
                        <h3>No articles found</h3>
                        <p>Try adjusting your filters or check back later for new content.</p>
                    </div>
                ) : (
                    articles.map((article) => (
                        <article
                            key={article.id}
                            className="article-card"
                            onClick={() => handleArticleClick(article.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleArticleClick(article.id);
                                }
                            }}
                        >
                            {/* Article Image */}
                            <div className="article-image">
                                {article.coverImage || article.imageUrl ? (
                                    <img
                                        src={article.coverImage || article.imageUrl}
                                        alt={article.title}
                                        loading="lazy"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent) {
                                                parent.classList.add('no-image');
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="article-placeholder">
                                        <md-icon>article</md-icon>
                                    </div>
                                )}
                            </div>

                            {/* Article Content */}
                            <div className="article-content">
                                <div className="article-meta">
                                    <span className="article-category">{article.category}</span>
                                    <span className="article-date">{formatDate(article.publishDate)}</span>
                                </div>
                                <h2 className="article-title">{article.title}</h2>
                                <p className="article-excerpt">
                                    {article.excerpt || article.content?.substring(0, 150) + '...' || ''}
                                </p>
                                <div className="article-tags">
                                    {article.tags.slice(0, 3).map((tag, index) => (
                                        <span key={index} className="article-tag">
                                            {tag}
                                        </span>
                                    ))}
                                    {article.tags.length > 3 && (
                                        <span className="article-tag-more">+{article.tags.length - 3} more</span>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="articles-pagination">
                    <div className="pagination-info">
                        <span>
                            Showing {((currentPage - 1) * ARTICLES_PER_PAGE) + 1} to{' '}
                            {Math.min(currentPage * ARTICLES_PER_PAGE, totalArticles)} of {totalArticles} articles
                        </span>
                    </div>
                    <div className="pagination-controls">
                        <md-icon-button
                            onClick={() => !hasPrevPage || setCurrentPage(currentPage - 1)}
                            aria-label="Previous page"
                            style={{ opacity: !hasPrevPage ? 0.5 : 1, pointerEvents: !hasPrevPage ? 'none' : 'auto' }}
                        >
                            <md-icon>chevron_left</md-icon>
                        </md-icon-button>

                        {getPageNumbers().map((pageNum) => (
                            <md-text-button
                                key={pageNum}
                                className={currentPage === pageNum ? 'current-page' : ''}
                                onClick={() => setCurrentPage(pageNum)}
                            >
                                {pageNum}
                            </md-text-button>
                        ))}

                        <md-icon-button
                            onClick={() => !hasNextPage || setCurrentPage(currentPage + 1)}
                            aria-label="Next page"
                            style={{ opacity: !hasNextPage ? 0.5 : 1, pointerEvents: !hasNextPage ? 'none' : 'auto' }}
                        >
                            <md-icon>chevron_right</md-icon>
                        </md-icon-button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Articles;
