import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Article, Category, Tag } from '../../services/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

import './style.css';

// 常量定义
const ARTICLES_PER_PAGE = 12;
const ANIMATION_DELAY_BASE = 50; // 基础延迟时间(ms)
const CONTENT_SHOW_DELAY = 200; // 内容显示延迟时间(ms)

// 应用状态类型定义
interface AppState {
    // 数据状态
    articles: Article[];
    categories: Category[];
    tags: Tag[];
    totalArticles: number;

    // UI状态
    isDataLoaded: boolean;
    isContentReady: boolean;
    error: string | null;

    // 筛选状态
    activeFilter: {
        type: 'category' | 'tag' | null;
        id: string | null;
    };
    currentPage: number;
}

// 初始状态
const initialState: AppState = {
    articles: [],
    categories: [],
    tags: [],
    totalArticles: 0,
    isDataLoaded: false,
    isContentReady: false,
    error: null,
    activeFilter: {
        type: null,
        id: null
    },
    currentPage: 1
};

const Articles: React.FC = () => {
  // ===================================================================
  // A区 - 数据与状态：所有Hooks调用都放在最上面
  // ===================================================================
  
  const navigate = useNavigate();
  const [state, setState] = useState<AppState>(initialState);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // 安全的状态更新函数
    const safeSetState = useCallback((updater: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
        if (!mountedRef.current) return;

        setState(prevState => {
            const updates = typeof updater === 'function' ? updater(prevState) : updater;
            return { ...prevState, ...updates };
        });
    }, []);

    // 数据加载函数
    const loadData = useCallback(async (
        page: number = 1,
        filter?: { type: 'category' | 'tag' | null; id: string | null }
    ) => {
        try {
            const currentFilter = filter || state.activeFilter;
            let articlesData: Article[] = [];
            let total = 0;

            // 根据筛选条件加载文章
            if (currentFilter.type === 'category' && currentFilter.id) {
                const response = await apiService.getArticles({
                    category: currentFilter.id,
                    status: 'published'
                });
                if (response.success && response.data) {
                    const allArticles = response.data;
                    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
                    const endIndex = startIndex + ARTICLES_PER_PAGE;
                    articlesData = allArticles.slice(startIndex, endIndex);
                    total = allArticles.length;
                }
            } else if (currentFilter.type === 'tag' && currentFilter.id) {
                const response = await apiService.getArticles({
                    tag_id: Number(currentFilter.id),
                    status: 'published'
                });
                if (response.success && response.data) {
                    const allArticles = response.data;
                    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
                    const endIndex = startIndex + ARTICLES_PER_PAGE;
                    articlesData = allArticles.slice(startIndex, endIndex);
                    total = allArticles.length;
                }
            } else {
                const response = await apiService.getArticles({
                    page,
                    page_size: ARTICLES_PER_PAGE,
                    status: 'published'
                });
                if (response.success && response.data) {
                    articlesData = response.data;
                    total = response.total || response.data.length;
                }
            }

            return { articles: articlesData, total };
        } catch (error) {
            console.error('Error loading articles:', error);
            throw error;
        }
    }, [state.activeFilter]);

    // 初始化数据加载
    const initializeData = useCallback(async () => {
        try {
            safeSetState({ error: null });

            // 并行加载基础数据
            const [categoriesResponse, tagsResponse] = await Promise.all([
                apiService.getCategories(),
                apiService.getTags()
            ]);

            // 加载文章数据
            const { articles, total } = await loadData(1);

            // 更新状态 - 数据已加载但内容未准备好显示
            safeSetState({
                categories: categoriesResponse.success ? categoriesResponse.data || [] : [],
                tags: tagsResponse.success ? tagsResponse.data || [] : [],
                articles,
                totalArticles: total,
                isDataLoaded: true,
                isContentReady: false // 关键：数据加载完成但内容还未准备好显示
            });

            // 延迟显示内容，确保DOM完全渲染
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }

            animationTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                    safeSetState({
                        isContentReady: true
                    });
                }
            }, CONTENT_SHOW_DELAY);

        } catch (error) {
            console.error('Error initializing data:', error);
            safeSetState({
                error: error instanceof Error ? error.message : 'Failed to load data',
                isDataLoaded: true,
                isContentReady: true
            });
        }
  }, [loadData, safeSetState]);

  // ===================================================================
  // B区 - 核心逻辑：所有事件处理函数和业务逻辑
  // ===================================================================

  // 处理筛选操作
    const handleFilter = useCallback(async (
        type: 'category' | 'tag' | null,
        id: string | null
    ) => {
        if (!state.isContentReady) return; // 简化：只在内容未准备好时阻止操作

        try {
            safeSetState({
                isContentReady: false // 隐藏当前内容
            });

            const newFilter = { type, id };
            const { articles, total } = await loadData(1, newFilter);

            // 更新数据
            safeSetState({
                articles,
                totalArticles: total,
                activeFilter: newFilter,
                currentPage: 1
            });

            // 延迟显示新内容
            setTimeout(() => {
                if (mountedRef.current) {
                    safeSetState({
                        isContentReady: true
                    });
                }
            }, 150); // 稍短的延迟用于筛选

        } catch (error) {
            console.error('Error filtering articles:', error);
            safeSetState({
                error: error instanceof Error ? error.message : 'Failed to filter articles',
                isContentReady: true
            });
        }
    }, [state.isContentReady, loadData, safeSetState]);

    // 处理分页
    const handlePageChange = useCallback(async (page: number) => {
        if (!state.isContentReady || page === state.currentPage) return;

        try {
            safeSetState({
                isContentReady: false
            });

            const { articles, total } = await loadData(page);

            safeSetState({
                articles,
                totalArticles: total,
                currentPage: page
            });

            setTimeout(() => {
                if (mountedRef.current) {
                    safeSetState({
                        isContentReady: true
                    });
                }
            }, 150);

        } catch (error) {
            console.error('Error changing page:', error);
            safeSetState({
                error: error instanceof Error ? error.message : 'Failed to load page',
                isContentReady: true
            });
        }
    }, [state.isContentReady, state.currentPage, loadData, safeSetState]);

    // 组件挂载时初始化
    useEffect(() => {
        mountedRef.current = true;
        initializeData();

        return () => {
            mountedRef.current = false;
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        };
    }, [initializeData]);

    // 渐变色生成函数
    const getGradientForIndex = useCallback((index: number): string => {
        const gradients = [
            "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)",
            "linear-gradient(135deg, #B8C5D1 0%, #D6E3F0 100%)",
            "linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)",
            "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
            "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",
            "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
            "linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)"
        ];
        return gradients[index % gradients.length];
    }, []);

    // 格式化日期
    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, []);

    // 分页计算
    const paginationInfo = useMemo(() => {
        const totalPages = Math.ceil(state.totalArticles / ARTICLES_PER_PAGE);
        const hasNextPage = state.currentPage < totalPages;
        const hasPrevPage = state.currentPage > 1;

        const getPageNumbers = () => {
            const pages = [];
            const maxVisiblePages = 5;
            let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            return pages;
        };

        return {
            totalPages,
            hasNextPage,
            hasPrevPage,
            pageNumbers: getPageNumbers()
        };
    }, [state.totalArticles, state.currentPage]);

    // 文章卡片组件
    const ArticleCard = React.memo(({ article, index }: { article: Article; index: number }) => {
        const gradient = getGradientForIndex(index);

        return (
            <div
                className={`article-card ${state.isContentReady ? 'article-card--visible' : 'article-card--hidden'}`}
                style={{
                    animationDelay: state.isContentReady ? `${index * ANIMATION_DELAY_BASE}ms` : '0ms'
                }}
                onClick={() => navigate(`/article/${article.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/article/${article.id}`);
                    }
                }}
            >
                <div className="article-image">
                    {article.coverImage || article.imageUrl ? (
                        <img
                            src={article.coverImage || article.imageUrl}
                            alt={article.title}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                    parent.style.background = gradient;
                                    parent.innerHTML = `
                    <div class="article-fallback">
                      <div class="fallback-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  `;
                                }
                            }}
                        />
                    ) : (
                        <div className="article-fallback" style={{ background: gradient }}>
                            <div className="fallback-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                <div className="article-content">
                    <div className="article-meta">
                        <span className="article-category">{article.category || 'Article'}</span>
                        <span className="article-date">{formatDate(article.publishDate || (article as any).created_at)}</span>
                    </div>
                    <h3 className="article-title">{article.title}</h3>
                    <p className="article-excerpt">
                        {article.excerpt || article.content?.substring(0, 120) + '...' || ''}
                    </p>
                </div>
            </div>
        );
  });

  // ===================================================================
  // C区 - 渲染：纯声明式渲染
  // ===================================================================

  // 卫语句：加载状态
  if (!state.isDataLoaded) {
        return (
            <div className="articles-page">
                <div className="articles-loading">
                    <LoadingSpinner />
                    <p>Loading articles...</p>
                </div>
            </div>
        );
  }

  // 卫语句：错误状态
  if (state.error) {
        return (
            <div className="articles-page">
                <ErrorMessage message={state.error} />
            </div>
        );
  }

  // 主要渲染
  return (
    <div className="articles-page">
            {/* Header */}
            <div className={`articles-header ${state.isContentReady ? 'header--visible' : 'header--hidden'}`}>
                <h1 className="articles-title">Articles</h1>
                <p className="articles-subtitle">
                    Discover insights, tutorials, and thoughts on web development and technology
                </p>
            </div>

            {/* Filters */}
            <div className={`articles-filters ${state.isContentReady ? 'filters--visible' : 'filters--hidden'}`}>
                {/* Category Filters */}
                <div className="filter-section">
                    <h3 className="filter-title">Categories</h3>
                    <div className="filter-chips">
                        {state.categories.map((category) => (
                            <md-filter-chip
                                key={category.id}
                                selected={state.activeFilter.type === 'category' && state.activeFilter.id === category.id}
                                onClick={() => handleFilter('category', category.id)}
                                style={{
                                    opacity: !state.isContentReady ? 0.6 : 1,
                                    pointerEvents: !state.isContentReady ? 'none' : 'auto',
                                    cursor: !state.isContentReady ? 'not-allowed' : 'pointer'
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
                        <md-filter-chip
                            selected={state.activeFilter.type !== 'tag'}
                            onClick={() => handleFilter(null, null)}
                            className="filter-chip-all"
                            style={{
                                opacity: !state.isContentReady ? 0.6 : 1,
                                pointerEvents: !state.isContentReady ? 'none' : 'auto',
                                cursor: !state.isContentReady ? 'not-allowed' : 'pointer'
                            }}
                        >
                            All Tags
                        </md-filter-chip>
                        {state.tags.slice(0, 10).map((tag) => (
                            <md-filter-chip
                                key={tag.id}
                                selected={state.activeFilter.type === 'tag' && state.activeFilter.id === tag.id}
                                onClick={() => handleFilter('tag', tag.id)}
                                style={{
                                    opacity: !state.isContentReady ? 0.6 : 1,
                                    pointerEvents: !state.isContentReady ? 'none' : 'auto',
                                    cursor: !state.isContentReady ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {tag.name}
                            </md-filter-chip>
                        ))}
                    </div>
                </div>
            </div>

            {/* Articles Grid */}
            <div className={`articles-grid ${state.isContentReady ? 'grid--visible' : 'grid--hidden'}`}>
                {state.articles.length > 0 ? (
                    state.articles.map((article, index) => (
                        <ArticleCard key={article.id} article={article} index={index} />
                    ))
                ) : (
                    <div className="no-articles">
                        <md-icon className="no-articles-icon">article</md-icon>
                        <h3>No articles found</h3>
                        <p>Try adjusting your filters or check back later for new content.</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {paginationInfo.totalPages > 1 && (
                <div className={`articles-pagination ${state.isContentReady ? 'pagination--visible' : 'pagination--hidden'}`}>
                    <div className="pagination-info">
                        <span>
                            Showing {((state.currentPage - 1) * ARTICLES_PER_PAGE) + 1} to{' '}
                            {Math.min(state.currentPage * ARTICLES_PER_PAGE, state.totalArticles)} of {state.totalArticles} articles
                        </span>
                    </div>
                    <div className="pagination-controls">
                        <md-icon-button
                            onClick={() => handlePageChange(state.currentPage - 1)}
                            aria-label="Previous page"
                            style={{
                                opacity: !paginationInfo.hasPrevPage || !state.isContentReady ? 0.5 : 1,
                                pointerEvents: !paginationInfo.hasPrevPage || !state.isContentReady ? 'none' : 'auto'
                            }}
                        >
                            <md-icon>chevron_left</md-icon>
                        </md-icon-button>

                        {paginationInfo.pageNumbers.map((pageNum) => (
                            <md-text-button
                                key={pageNum}
                                className={state.currentPage === pageNum ? 'current-page' : ''}
                                onClick={() => handlePageChange(pageNum)}
                                style={{
                                    opacity: !state.isContentReady ? 0.6 : 1,
                                    pointerEvents: !state.isContentReady ? 'none' : 'auto'
                                }}
                            >
                                {pageNum}
                            </md-text-button>
                        ))}

                        <md-icon-button
                            onClick={() => handlePageChange(state.currentPage + 1)}
                            aria-label="Next page"
                            style={{
                                opacity: !paginationInfo.hasNextPage || !state.isContentReady ? 0.5 : 1,
                                pointerEvents: !paginationInfo.hasNextPage || !state.isContentReady ? 'none' : 'auto'
                            }}
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