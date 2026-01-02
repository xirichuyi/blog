import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Article, Category, Tag } from '../../services/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import ArticleCard from '../../components/ui/ArticleCard';

import './style.css';

// 常量定义
const ARTICLES_PER_PAGE = 12;

// 应用状态类型定义
interface AppState {
    // 数据状态
    articles: Article[];
    categories: Category[];
    tags: Tag[];
    totalArticles: number;

    // UI状态
    isDataLoaded: boolean;
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
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, setState] = useState<AppState>(initialState);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
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
        filter: { type: 'category' | 'tag' | null; id: string | null } = { type: null, id: null }
    ) => {
        try {
            let articlesData: Article[] = [];
            let total = 0;

            // 根据筛选条件加载文章
            if (filter.type === 'category' && filter.id) {
                const response = await apiService.getArticles({
                    category: filter.id,
                    status: 'published'
                });
                if (response.success && response.data) {
                    const allArticles = response.data;
                    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
                    const endIndex = startIndex + ARTICLES_PER_PAGE;
                    articlesData = allArticles.slice(startIndex, endIndex);
                    total = allArticles.length;
                }
            } else if (filter.type === 'tag' && filter.id) {
                const response = await apiService.getArticles({
                    tag_id: Number(filter.id),
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
    }, []);

    // 初始化数据加载
    const initializeData = useCallback(async () => {
        try {
            safeSetState({ error: null });

            // 1. 并行加载分类和标签元数据以及所有文章（用于计数）
            // 注意：这些数据只需要加载一次
            const [categoriesResponse, tagsResponse, allArticlesResponse] = await Promise.all([
                apiService.getCategories(),
                apiService.getTags(),
                apiService.getArticles({ status: 'published' })
            ]);

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

            safeSetState({
                categories: processedCategories,
                tags: processedTags,
                totalArticles: allArticles.length
            });

        } catch (error) {
            console.error('Error initializing metadata:', error);
            safeSetState({
                error: error instanceof Error ? error.message : 'Failed to load metadata'
            });
        }
    }, [safeSetState]);

    // 根据 URL 参数加载文章数据（URL 中直接使用 ID）
    useEffect(() => {
        const syncWithUrl = async () => {
            const categoryId = searchParams.get('category');
            const tagId = searchParams.get('tag');
            const pageStr = searchParams.get('page');
            const page = pageStr ? parseInt(pageStr, 10) : 1;

            let filter: { type: 'category' | 'tag' | null; id: string | null } = { type: null, id: null };
            
            // URL 中直接使用 ID，无需映射
            if (categoryId) {
                filter = { type: 'category', id: categoryId };
            } else if (tagId) {
                filter = { type: 'tag', id: tagId };
            }

            // 只有在已加载过数据后才显示过渡动画（首次加载不需要）
            if (hasInitialLoaded) {
                setIsTransitioning(true);
            }

            try {
                const { articles, total } = await loadData(page, filter);
                
                // 短暂延迟让过渡动画平滑（首次加载不延迟）
                const transitionDelay = hasInitialLoaded ? 150 : 0;
                
                setTimeout(() => {
                    safeSetState(prev => ({
                        articles,
                        totalArticles: filter.type ? total : prev.totalArticles,
                        activeFilter: filter,
                        currentPage: page,
                        isDataLoaded: true
                    }));
                    setIsTransitioning(false);
                    
                    // 标记首次加载完成
                    if (!hasInitialLoaded) {
                        setHasInitialLoaded(true);
                    }
                }, transitionDelay);
            } catch (error) {
                safeSetState({
                    error: error instanceof Error ? error.message : 'Failed to load articles',
                    isDataLoaded: true
                });
                setIsTransitioning(false);
            }
        };

        syncWithUrl();
    }, [searchParams, loadData, safeSetState, hasInitialLoaded]);

    // ===================================================================
    // B区 - 核心逻辑：所有事件处理函数和业务逻辑
    // ===================================================================

    // 处理筛选操作 - URL 中直接使用 ID
    const handleFilter = useCallback((
        type: 'category' | 'tag' | null,
        id: string | null
    ) => {
        const newParams = new URLSearchParams();
        if (type && id) {
            newParams.set(type, id);
        }
        // 筛选变更时重置到第一页
        setSearchParams(newParams);
    }, [setSearchParams]);

    // 处理分页
    const handlePageChange = useCallback((page: number) => {
        const newParams = new URLSearchParams(searchParams);
        if (page > 1) {
            newParams.set('page', page.toString());
        } else {
            newParams.delete('page');
        }
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

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
            <div className="articles-header">
                <h1 className="articles-title">Articles</h1>
                <p className="articles-subtitle">
                    Discover insights, tutorials, and thoughts on web development and technology
                </p>
            </div>

            <div className="articles-layout">
                {/* Sidebar Filters */}
                <aside className="articles-sidebar">
                    {/* Category Filters */}
                    <div className="filter-section">
                        <h3 className="filter-title">Categories</h3>
                        <div className="filter-options">
                            <div
                                className={`filter-option ${state.activeFilter.type === null ? 'filter-option--selected' : ''}`}
                                onClick={() => handleFilter(null, null)}
                                style={{
                                    '--filter-animation-delay': '0s'
                                } as React.CSSProperties}
                            >
                                <md-icon>folder</md-icon>
                                <span>All Articles ({state.totalArticles})</span>
                            </div>
                            {state.categories
                                .filter(category => category.name !== 'All Articles')
                                .map((category, index) => (
                                    <div
                                        key={category.id}
                                        className={`filter-option ${state.activeFilter.type === 'category' && state.activeFilter.id === category.id ? 'filter-option--selected' : ''}`}
                                        onClick={() => handleFilter('category', category.id)}
                                        style={{
                                            '--filter-animation-delay': `${(index + 1) * 0.05}s`
                                        } as React.CSSProperties}
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
                            {state.tags.slice(0, 10).map((tag, index) => (
                                <div
                                    key={tag.id}
                                    className={`filter-option ${state.activeFilter.type === 'tag' && state.activeFilter.id === tag.id ? 'filter-option--selected' : ''}`}
                                    onClick={() => handleFilter('tag', tag.id)}
                                    style={{
                                        '--filter-animation-delay': `${index * 0.05}s`
                                    } as React.CSSProperties}
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
                    <div className={`articles-grid ${isTransitioning ? 'articles-grid--transitioning' : ''} ${hasInitialLoaded ? 'articles-grid--loaded' : ''}`}>
                        {state.articles.length > 0 ? (
                            state.articles.map((article, index) => {
                                const cardData = convertArticleToCardFormat(article, index);
                                return (
                                    <div
                                        key={article.id}
                                        className="article-card-wrapper"
                                        style={{
                                            '--animation-delay': `${index * 0.1 + 0.3}s`
                                        } as React.CSSProperties}
                                    >
                                        <ArticleCard
                                            id={cardData.id}
                                            title={cardData.title}
                                            description={cardData.description}
                                            date={cardData.date}
                                            tag={cardData.tag}
                                            coverImage={cardData.coverImage}
                                            gradient={cardData.gradient}
                                            onClick={handleArticleClick}
                                            variant="default"
                                        />
                                    </div>
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
                        <div className="articles-pagination">
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
                                        opacity: !paginationInfo.hasPrevPage ? 0.5 : 1,
                                        pointerEvents: !paginationInfo.hasPrevPage ? 'none' : 'auto'
                                    }}
                                >
                                    <md-icon>chevron_left</md-icon>
                                </md-icon-button>

                                {paginationInfo.pageNumbers.map((pageNum) => (
                                    <md-text-button
                                        key={pageNum}
                                        className={state.currentPage === pageNum ? 'current-page' : ''}
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </md-text-button>
                                ))}

                                <md-icon-button
                                    onClick={() => handlePageChange(state.currentPage + 1)}
                                    aria-label="Next page"
                                    style={{
                                        opacity: !paginationInfo.hasNextPage ? 0.5 : 1,
                                        pointerEvents: !paginationInfo.hasNextPage ? 'none' : 'auto'
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