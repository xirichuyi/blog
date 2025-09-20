import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api'
import type { Article, Category, Tag, PaginationInfo } from '../../services/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
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

    // 固定的文章槽位数量，避免DOM重新创建
    const FIXED_ARTICLE_SLOTS = 12;

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [articlesLoading, setArticlesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Active filter state - only one filter can be active at a time
    const [activeFilter, setActiveFilter] = useState<{ type: 'category' | 'tag' | null, id: string | null }>({
        type: null,
        id: null
    });

    // Filter operation state - 防止重复点击和请求
    const [isFilterOperating, setIsFilterOperating] = useState(false);


    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);

    // Load articles based on current filter
    const loadArticles = useCallback(async (page: number = 1, filter?: { type: 'category' | 'tag' | null, id: string | null }) => {
        try {
            setArticlesLoading(true);
            setError(null);

            // 使用传入的filter或当前的activeFilter
            const currentFilter = filter || activeFilter;

            if (currentFilter.type === 'category' && currentFilter.id !== 'all' && currentFilter.id) {
                // Load articles by category
                const response = await apiService.getArticles({
                    category: currentFilter.id,
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
            } else if (currentFilter.type === 'tag' && currentFilter.id) {
                // Load articles by tag
                const response = await apiService.getArticles({
                    tag_id: Number(currentFilter.id),
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
    }, []);

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

    // 当页码变化时重新加载文章（但筛选变化时不依赖这个effect）
    useEffect(() => {
        if (!isLoading && currentPage !== 1) {
            loadArticles(currentPage, activeFilter);
        }
    }, [currentPage, loadArticles, isLoading, activeFilter]);

    // Handle category filter with state management
    const handleCategoryFilter = useCallback(async (categoryId: string) => {
        // 如果正在操作中，直接返回
        if (isFilterOperating) return;

        setIsFilterOperating(true);
        try {
            // 使用操作锁防止快速连续点击
            await globalOperationLock.withLock('category-filter', async () => {
                const newFilter = { type: 'category' as const, id: categoryId };
                setActiveFilter(newFilter);
                setCurrentPage(1); // 重置页码
                // 直接调用loadArticles，避免useEffect的延迟
                await loadArticles(1, newFilter);
            });
        } finally {
            // 延迟重置操作状态，确保用户能看到视觉反馈
            setTimeout(() => setIsFilterOperating(false), 300);
        }
    }, [isFilterOperating, loadArticles]);

    // Handle tag filter with state management
    const handleTagFilter = useCallback(async (tagId: string) => {
        // 如果正在操作中，直接返回
        if (isFilterOperating) return;

        setIsFilterOperating(true);
        try {
            await globalOperationLock.withLock('tag-filter', async () => {
                const newFilter = { type: 'tag' as const, id: tagId };
                setActiveFilter(newFilter);
                setCurrentPage(1); // 重置页码
                // 直接调用loadArticles，避免useEffect的延迟
                await loadArticles(1, newFilter);
            });
        } finally {
            setTimeout(() => setIsFilterOperating(false), 300);
        }
    }, [isFilterOperating, loadArticles]);

    // Handle reset filter (All Tags click)
    const handleResetFilter = useCallback(async () => {
        if (isFilterOperating) return;

        setIsFilterOperating(true);
        try {
            await globalOperationLock.withLock('reset-filter', async () => {
                const newFilter = { type: null, id: null };
                setActiveFilter(newFilter);
                setCurrentPage(1); // 重置页码
                // 直接调用loadArticles，避免useEffect的延迟
                await loadArticles(1, newFilter);
            });
        } finally {
            setTimeout(() => setIsFilterOperating(false), 300);
        }
    }, [isFilterOperating, loadArticles]);

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


    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // 创建固定的文章槽位，避免DOM重新创建
    const articleSlots = useMemo(() => {
        const slots = [];
        for (let i = 0; i < FIXED_ARTICLE_SLOTS; i++) {
            const article = articles[i];
            const isVisible = Boolean(article);
            const isLoading = articlesLoading && !article;

            slots.push({
                index: i,
                article: article || null,
                isVisible,
                isLoading,
                key: `article-slot-${i}` // 固定的key，不会变化
            });
        }
        return slots;
    }, [articles, articlesLoading]);

    // 文章槽位组件 - 复用DOM，只更新内容
    const ArticleSlot = React.memo(({ slot }: { slot: any }) => {
        const { article, isVisible, isLoading } = slot;

        if (isLoading) {
            return (
                <div className="article-card article-card--skeleton">
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
            );
        }

        if (!isVisible || !article) {
            return <div className="article-card article-card--hidden" style={{ visibility: 'hidden' }}></div>;
        }

        return (
            <article
                className="article-card article-card--visible"
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
        );
    });

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
                        {categories.map((category) => (
                            <md-filter-chip
                                key={category.id}
                                {...(activeFilter.type === 'category' && activeFilter.id === category.id ? { selected: true } : {})}
                                onClick={() => handleCategoryFilter(category.id)}
                                style={{
                                    opacity: isFilterOperating ? 0.6 : 1,
                                    pointerEvents: isFilterOperating ? 'none' : 'auto',
                                    cursor: isFilterOperating ? 'not-allowed' : 'pointer'
                                }}
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
                        {/* 添加 All Tags 选项 */}
                        <md-filter-chip
                            {...(activeFilter.type !== 'tag' ? { selected: true } : {})}
                            onClick={() => handleResetFilter()}
                            className="filter-chip-all"
                            style={{
                                opacity: isFilterOperating ? 0.6 : 1,
                                pointerEvents: isFilterOperating ? 'none' : 'auto',
                                cursor: isFilterOperating ? 'not-allowed' : 'pointer'
                            }}
                        >
                            All Tags
                        </md-filter-chip>
                        {tags.slice(0, 10).map((tag) => (
                            <md-filter-chip
                                key={tag.id}
                                {...(activeFilter.type === 'tag' && activeFilter.id === tag.id ? { selected: true } : {})}
                                onClick={() => handleTagFilter(tag.id)}
                                style={{
                                    opacity: isFilterOperating ? 0.6 : 1,
                                    pointerEvents: isFilterOperating ? 'none' : 'auto',
                                    cursor: isFilterOperating ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {tag.name}
                            </md-filter-chip>
                        ))}
                    </div>
                </div>
            </div>


            {/* Articles Grid - 使用固定槽位避免DOM重新创建 */}
            <div className="articles-grid">
                {/* 固定的文章槽位，使用for循环和固定key */}
                {articleSlots.map((slot) => (
                    <ArticleSlot key={slot.key} slot={slot} />
                ))}

                {/* 无文章提示 - 只在没有任何文章且不是加载状态时显示 */}
                {!articlesLoading && articles.length === 0 && (
                    <div className="no-articles" style={{ gridColumn: '1 / -1' }}>
                        <md-icon className="no-articles-icon">article</md-icon>
                        <h3>No articles found</h3>
                        <p>Try adjusting your filters or check back later for new content.</p>
                    </div>
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
