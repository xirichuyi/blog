import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Article, Category, Tag } from '../../services/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { cn } from '@/lib/utils';
import { LayoutGrid, Folder, Hash, Calendar, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

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
            <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 sm:px-6 lg:px-8">
                <LoadingSpinner />
                <p className="text-sm text-muted-foreground">Loading articles...</p>
            </div>
        );
    }

    // 卫语句：错误状态
    if (state.error) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                <ErrorMessage message={state.error} />
            </div>
        );
    }

    // 主要渲染
    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            {/* Header */}
            <header className="mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Articles</h1>
                <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                    Discover insights, tutorials, and thoughts on web development and technology
                </p>
            </header>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
                {/* Sidebar Filters */}
                <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
                    {/* Category Filters */}
                    <div>
                        <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Categories
                        </h3>
                        <div className="space-y-1">
                            <FilterItem
                                icon={<LayoutGrid className="size-4 shrink-0" />}
                                label="All Articles"
                                count={state.totalArticles}
                                active={state.activeFilter.type === null}
                                onClick={() => handleFilter(null, null)}
                            />
                            {state.categories
                                .filter(category => category.name !== 'All Articles')
                                .map(category => (
                                    <FilterItem
                                        key={category.id}
                                        icon={<Folder className="size-4 shrink-0" />}
                                        label={category.name}
                                        count={category.count || 0}
                                        active={state.activeFilter.type === 'category' && state.activeFilter.id === category.id}
                                        onClick={() => handleFilter('category', category.id)}
                                    />
                                ))}
                        </div>
                    </div>

                    {/* Tag Filters */}
                    <div>
                        <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Tags
                        </h3>
                        <div className="space-y-1">
                            {state.tags.slice(0, 10).map(tag => (
                                <FilterItem
                                    key={tag.id}
                                    icon={<Hash className="size-4 shrink-0" />}
                                    label={tag.name}
                                    count={tag.count || 0}
                                    active={state.activeFilter.type === 'tag' && state.activeFilter.id === tag.id}
                                    onClick={() => handleFilter('tag', tag.id)}
                                />
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main>
                    {/* Articles Grid */}
                    {state.articles.length > 0 ? (
                        <div
                            className={cn(
                                'grid grid-cols-1 gap-6 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-3',
                                isTransitioning && 'opacity-50'
                            )}
                        >
                            {state.articles.map((article, index) => {
                                const card = convertArticleToCardFormat(article, index);
                                return (
                                    <Card
                                        key={article.id}
                                        onClick={() => handleArticleClick(card.id)}
                                        className="group flex cursor-pointer flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                                    >
                                        <div className="aspect-[16/10] w-full overflow-hidden">
                                            {card.coverImage ? (
                                                <img
                                                    src={card.coverImage}
                                                    alt={card.title}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="h-full w-full" style={{ background: card.gradient }} />
                                            )}
                                        </div>
                                        <CardHeader className="gap-2 p-5">
                                            <Badge variant="secondary" className="w-fit">{card.tag}</Badge>
                                            <CardTitle className="line-clamp-2 text-lg transition-colors group-hover:text-primary">
                                                {card.title}
                                            </CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {card.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardFooter className="mt-auto gap-2 px-5 pb-5 text-xs text-muted-foreground">
                                            <Calendar className="size-3.5" />
                                            <span>{card.date}</span>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
                            <FileText className="size-10 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold text-foreground">No articles found</h3>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Try adjusting your filters or check back later for new content.
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {paginationInfo.totalPages > 1 && (
                        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
                            <p className="text-sm text-muted-foreground">
                                Showing {((state.currentPage - 1) * ARTICLES_PER_PAGE) + 1} to{' '}
                                {Math.min(state.currentPage * ARTICLES_PER_PAGE, state.totalArticles)} of {state.totalArticles} articles
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={!paginationInfo.hasPrevPage}
                                    onClick={() => handlePageChange(state.currentPage - 1)}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft />
                                </Button>
                                {paginationInfo.pageNumbers.map(pageNum => (
                                    <Button
                                        key={pageNum}
                                        variant={state.currentPage === pageNum ? 'default' : 'ghost'}
                                        size="icon"
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={!paginationInfo.hasNextPage}
                                    onClick={() => handlePageChange(state.currentPage + 1)}
                                    aria-label="Next page"
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// 侧边栏筛选项（shadcn 风格）
interface FilterItemProps {
    icon: React.ReactNode;
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}

const FilterItem: React.FC<FilterItemProps> = ({ icon, label, count, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            active
                ? 'bg-secondary font-medium text-secondary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
    >
        <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{count}</span>
    </button>
);

export default Articles;