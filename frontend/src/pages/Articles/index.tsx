import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Article, Category, Tag } from '../../services/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import ArticleCard from '../../components/ui/ArticleCard';

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

            // 并行加载基础数据和所有文章总数
            const [categoriesResponse, tagsResponse, allArticlesResponse] = await Promise.all([
                apiService.getCategories(),
                apiService.getTags(),
                apiService.getArticles({ status: 'published' }) // 获取所有文章来计算总数
            ]);

            // 加载第一页文章数据
            const { articles } = await loadData(1);

            // 计算总文章数
            const totalArticles = allArticlesResponse.success ?
                (allArticlesResponse.total || allArticlesResponse.data?.length || 0) : 0;

            // 处理分类和标签数据，确保包含文章计数
            const allArticles = allArticlesResponse.success ? allArticlesResponse.data || [] : [];
            const processedCategories = categoriesResponse.success ?
                (categoriesResponse.data || []).map(category => ({
                    ...category,
                    count: category.count || allArticles.filter(article => article.category === category.name || article.category === category.id).length
                })) : [];

            const processedTags = tagsResponse.success ?
                (tagsResponse.data || []).map(tag => ({
                    ...tag,
                    count: tag.count || allArticles.filter(article =>
                        article.tags?.some((articleTag: any) =>
                            articleTag.id === tag.id || articleTag.name === tag.name
                        )
                    ).length
                })) : [];

            // 更新状态 - 数据已加载但内容未准备好显示
            safeSetState({
                categories: processedCategories,
                tags: processedTags,
                articles,
                totalArticles,
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

    // 获取分类图标
    const getCategoryIcon = useCallback((categoryName: string): string => {
        const categoryIcons: Record<string, string> = {
            'Web': 'web',
            'web': 'web',
            'linuxDo攻略': 'terminal',
            'linux': 'terminal',
            'linuxdo': 'terminal',
            '个人乱谈': 'chat',
            '个人': 'person',
            '作品集': 'work',
            '作品': 'work',
            '教程': 'school',
            'tutorial': 'school',
            'tech': 'code',
            'technology': 'code',
            'programming': 'code',
            'frontend': 'web',
            'backend': 'dns',
            'database': 'storage',
            'mobile': 'phone_android',
            'design': 'palette',
            'ai': 'smart_toy',
            'machine learning': 'psychology',
            'data': 'analytics',
            'security': 'security',
            'devops': 'settings',
            'cloud': 'cloud',
            'javascript': 'code',
            'react': 'code',
            'vue': 'code',
            'angular': 'code',
            'node': 'code',
            'python': 'code',
            'java': 'code',
            'golang': 'code',
            'rust': 'code',
            'php': 'code'
        };

        const lowerName = categoryName.toLowerCase();
        return categoryIcons[lowerName] || categoryIcons[categoryName] || 'folder';
    }, []);

    // 获取标签图标
    const getTagIcon = useCallback((tagName: string): string => {
        const tagIcons: Record<string, string> = {
            'Go': 'code',
            'go': 'code',
            'python': 'code',
            'Python': 'code',
            'Rust': 'memory',
            'rust': 'memory',
            '前端': 'web',
            'frontend': 'web',
            '杂七杂八': 'category',
            '爬虫': 'bug_report',
            'crawler': 'bug_report',
            'javascript': 'code',
            'js': 'code',
            'typescript': 'code',
            'ts': 'code',
            'react': 'code',
            'vue': 'code',
            'angular': 'code',
            'node': 'code',
            'nodejs': 'code',
            'express': 'code',
            'fastapi': 'speed',
            'django': 'code',
            'flask': 'code',
            'database': 'storage',
            'sql': 'storage',
            'mongodb': 'storage',
            'redis': 'storage',
            'docker': 'inventory',
            'kubernetes': 'inventory',
            'aws': 'cloud',
            'azure': 'cloud',
            'gcp': 'cloud',
            'linux': 'terminal',
            'ubuntu': 'terminal',
            'centos': 'terminal',
            'nginx': 'dns',
            'apache': 'dns',
            'git': 'source',
            'github': 'source',
            'gitlab': 'source',
            'ci/cd': 'sync',
            'testing': 'bug_report',
            'security': 'security',
            'performance': 'speed',
            'optimization': 'tune',
            'api': 'api',
            'rest': 'api',
            'graphql': 'api',
            'microservices': 'account_tree',
            'architecture': 'account_tree',
            'design pattern': 'pattern',
            'algorithm': 'psychology',
            'data structure': 'psychology',
            'machine learning': 'smart_toy',
            'ai': 'smart_toy',
            'blockchain': 'link',
            'crypto': 'lock',
            'mobile': 'phone_android',
            'ios': 'phone_iphone',
            'android': 'phone_android',
            'flutter': 'phone_android',
            'react native': 'phone_android',
            'ui': 'palette',
            'ux': 'palette',
            'design': 'palette',
            'css': 'palette',
            'sass': 'palette',
            'less': 'palette',
            'tailwind': 'palette',
            'bootstrap': 'palette',
            'webpack': 'build',
            'vite': 'build',
            'rollup': 'build',
            'babel': 'build',
            'eslint': 'build',
            'prettier': 'build'
        };

        const lowerName = tagName.toLowerCase();
        return tagIcons[lowerName] || tagIcons[tagName] || 'label';
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

    // 转换文章数据为ArticleCard格式
    const convertArticleToCardFormat = useCallback((article: Article, index: number) => {
        return {
            id: article.id,
            title: article.title,
            description: article.excerpt || article.content?.substring(0, 120) + '...' || '',
            date: formatDate(article.publishDate || (article as any).created_at),
            tag: article.category || 'Article',
            coverImage: article.coverImage || article.imageUrl,
            gradient: getGradientForIndex(index)
        };
    }, [formatDate, getGradientForIndex]);

    // 文章点击处理
    const handleArticleClick = useCallback((articleId: string) => {
        navigate(`/article/${articleId}`);
    }, [navigate]);

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

            <div className="articles-layout">
                {/* Sidebar Filters */}
                <aside className={`articles-sidebar ${state.isContentReady ? 'sidebar--visible' : 'sidebar--hidden'}`}>
                    {/* Category Filters */}
                    <div className="filter-section">
                        <h3 className="filter-title">Categories</h3>
                        <div className="filter-options">
                            <div
                                className={`filter-option ${state.activeFilter.type === null ? 'filter-option--selected' : ''}`}
                                onClick={() => handleFilter(null, null)}
                                style={{
                                    opacity: !state.isContentReady ? 0.6 : 1,
                                    pointerEvents: !state.isContentReady ? 'none' : 'auto',
                                    cursor: !state.isContentReady ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <md-icon>folder</md-icon>
                                <span>All Articles ({state.totalArticles})</span>
                            </div>
                            {state.categories
                                .filter(category => category.name !== 'All Articles')
                                .map((category) => (
                                    <div
                                        key={category.id}
                                        className={`filter-option ${state.activeFilter.type === 'category' && state.activeFilter.id === category.id ? 'filter-option--selected' : ''}`}
                                        onClick={() => handleFilter('category', category.id)}
                                        style={{
                                            opacity: !state.isContentReady ? 0.6 : 1,
                                            pointerEvents: !state.isContentReady ? 'none' : 'auto',
                                            cursor: !state.isContentReady ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        <md-icon>{getCategoryIcon(category.name)}</md-icon>
                                        <span>{category.name} ({category.count || 0})</span>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Tag Filters */}
                    <div className="filter-section">
                        <h3 className="filter-title">Tags</h3>
                        <div className="filter-options">
                            {state.tags.slice(0, 10).map((tag) => (
                                <div
                                    key={tag.id}
                                    className={`filter-option ${state.activeFilter.type === 'tag' && state.activeFilter.id === tag.id ? 'filter-option--selected' : ''}`}
                                    onClick={() => handleFilter('tag', tag.id)}
                                    style={{
                                        opacity: !state.isContentReady ? 0.6 : 1,
                                        pointerEvents: !state.isContentReady ? 'none' : 'auto',
                                        cursor: !state.isContentReady ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <md-icon>{getTagIcon(tag.name)}</md-icon>
                                    <span>{tag.name} ({tag.count || 0})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="articles-main">
                    {/* Articles Grid */}
                    <div className={`articles-grid ${state.isContentReady ? 'grid--visible' : 'grid--hidden'}`}>
                        {state.articles.length > 0 ? (
                            state.articles.map((article, index) => {
                                const cardData = convertArticleToCardFormat(article, index);
                                return (
                                    <ArticleCard
                                        key={article.id}
                                        id={cardData.id}
                                        title={cardData.title}
                                        description={cardData.description}
                                        date={cardData.date}
                                        tag={cardData.tag}
                                        coverImage={cardData.coverImage}
                                        gradient={cardData.gradient}
                                        onClick={handleArticleClick}
                                        variant="compact"
                                        className={`${state.isContentReady ? 'article-card--visible' : 'article-card--hidden'}`}
                                        style={{
                                            animationDelay: state.isContentReady ? `${index * ANIMATION_DELAY_BASE}ms` : '0ms'
                                        }}
                                    />
                                );
                            })
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
                </main>
            </div>
        </div>
    );
};

export default Articles;