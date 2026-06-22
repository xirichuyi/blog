import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthorCard from './components/AuthorCard';
import { BlogCard } from '@/components/blog/BlogCard';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { cn } from '@/lib/utils';
import { apiService } from '../../services/api';
import type { Article } from '../../services/types';
import { logger } from '../../utils/logger';
import { getGradientForIndex, PAGE_SIZE } from '../../constants';
import { Search, X, Loader2, FileSearch, Server, Cpu, MemoryStick, HardDrive } from 'lucide-react';

// 服务器指标进度条
function StatusMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs">
        {icon}
        <span className="text-muted-foreground">{label}</span>
        <span className="ml-auto font-medium tabular-nums text-foreground">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

// 服务器状态接口
interface ServerStatus {
  status: string;
  timestamp: string;
  version: string;
  uptime_seconds: number;
  checks: {
    database: {
      status: string;
      response_time_ms: number;
      message: string;
    };
    memory: {
      status: string;
      response_time_ms: number;
      message: string;
      details: {
        memory_usage_mb: number;
        total_memory_mb: number;
        usage_percent: number;
      };
    };
    disk: {
      status: string;
      response_time_ms: number;
      message: string;
      details: {
        usage_percent: number;
        used_bytes: number;
        total_bytes: number;
      };
    };
  };
  metrics: {
    memory_usage_mb: number;
    cpu_usage_percent: number;
    disk_usage_percent: number;
    disk_used_bytes: number;
    disk_total_bytes: number;
    active_connections: number;
    request_count: number;
  };
}

const Home: React.FC = () => {
  // ===================================================================
  // A区 - 数据与状态：所有Hooks调用都放在最上面
  // ===================================================================
  const navigate = useNavigate();
  const location = useLocation();

  // 主要数据状态
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 动画状态
  const [isContentReady, setIsContentReady] = useState(false);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  // 服务器状态
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverStatusLoading, setServerStatusLoading] = useState(true);

  // 用于存储 content ready 定时器
  const contentReadyTimerRef = React.useRef<NodeJS.Timeout>();

  // 数据加载Hook
  const loadArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getArticles({
        page: 1,
        page_size: PAGE_SIZE.HOME,
        status: 'published'
      });

      if (response.success && response.data) {
        setArticles(response.data);

        // 清理之前的定时器
        if (contentReadyTimerRef.current) {
          clearTimeout(contentReadyTimerRef.current);
        }
        // 延迟显示内容，实现苹果风格的加载动画
        contentReadyTimerRef.current = setTimeout(() => {
          setIsContentReady(true);
        }, 200);
      }
    } catch (error) {
      logger.error('Error loading articles:', error);
      setError(error instanceof Error ? error.message : 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始数据加载
  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // 监听路由变化，每次进入Home页面都重新加载数据（不保留组件状态）
  useEffect(() => {
    if (location.pathname === '/') {
      // 重置所有状态
      setArticles([]);
      setAllArticles([]);
      setIsLoading(true);
      setError(null);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setServerStatus(null);
      setServerStatusLoading(false);
      setIsContentReady(false);

      // 重新加载数据
      loadArticles();
    }
  }, [location.pathname, loadArticles]);

  // 延迟加载搜索数据
  useEffect(() => {
    const timer = setTimeout(() => {
      const loadSearchArticles = async () => {
        try {
          const response = await apiService.getArticles({
            page: 1,
            page_size: 20,
            status: 'published'
          });

          if (response.success && response.data) {
            setAllArticles(response.data);
          }
        } catch (err) {
          logger.warn('Failed to load articles for search:', err);
        }
      };

      if (allArticles.length === 0) {
        loadSearchArticles();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [allArticles.length]);

  // 服务器状态数据加载
  useEffect(() => {
    const fetchServerStatus = async () => {
      try {
        setServerStatusLoading(true);
        const response = await apiService.detailedHealthCheck();
        if (response.success && response.data) {
          setServerStatus(response.data as unknown as ServerStatus);
        } else {
          logger.error('Failed to fetch server status:', response.error);
        }
      } catch (error) {
        logger.error('Error fetching server status:', error);
      } finally {
        setServerStatusLoading(false);
      }
    };

    fetchServerStatus();
  }, []);

  // 搜索防抖处理
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allArticles]);

  // ===================================================================
  // B区 - 核心逻辑：所有事件处理函数和业务逻辑
  // ===================================================================

  // 文章点击处理
  const handleArticleClick = useCallback((articleId: string) => {
    navigate(`/article/${articleId}`);
    if (showSearchResults) {
      setShowSearchResults(false);
      setSearchQuery('');
    }
  }, [navigate, showSearchResults]);

  // 搜索功能
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const searchTerm = query.toLowerCase().trim();
      const results = allArticles.filter(article => {
        const titleMatch = article.title.toLowerCase().includes(searchTerm);
        const excerptMatch = article.excerpt.toLowerCase().includes(searchTerm);
        const authorMatch = article.author.toLowerCase().includes(searchTerm);
        const categoryMatch = article.category.toLowerCase().includes(searchTerm);
        const tagsMatch = article.tags.some(tag => tag.toLowerCase().includes(searchTerm));

        return titleMatch || excerptMatch || authorMatch || categoryMatch || tagsMatch;
      });

      results.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      setSearchResults(results.slice(0, 5));
    } catch (err) {
      logger.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [allArticles]);

  // 搜索输入处理
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // 搜索焦点处理
  const handleSearchFocus = useCallback(() => {
    if (searchQuery.trim()) {
      setShowSearchResults(true);
    }
  }, [searchQuery]);

  // 搜索失焦处理 - 使用ref存储timer以便清理
  const searchBlurTimerRef = React.useRef<NodeJS.Timeout>();

  // 组件卸载时清理所有timer - 必须在所有条件语句之前声明
  useEffect(() => {
    return () => {
      if (searchBlurTimerRef.current) {
        clearTimeout(searchBlurTimerRef.current);
      }
      if (contentReadyTimerRef.current) {
        clearTimeout(contentReadyTimerRef.current);
      }
    };
  }, []);

  const handleSearchBlur = useCallback(() => {
    searchBlurTimerRef.current = setTimeout(() => setShowSearchResults(false), 200);
  }, []);

  // 清空搜索
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  // 导航到文章页面
  const handleSeeMoreArticles = useCallback(() => {
    navigate('/articles');
  }, [navigate]);

  // 文章数据转换
  const convertArticleToDisplayFormat = useCallback((article: Article, index: number) => {
    return {
      id: article.id,
      title: article.title,
      description: article.excerpt || article.content?.substring(0, 150) + '...' || '',
      date: new Date(article.publishDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      tag: article.category || 'Article',
      gradient: getGradientForIndex(index),
      coverImage: article.coverImage || article.imageUrl
    };
  }, []);

  // 数据准备 - 使用useMemo避免不必要的重复计算
  const displayArticles = useMemo(() =>
    articles.slice(0, PAGE_SIZE.HOME).map((article, index) =>
      convertArticleToDisplayFormat(article, index)
    ), [articles, convertArticleToDisplayFormat]
  );

  const featuredArticles = useMemo(() => displayArticles.slice(0, 1), [displayArticles]);
  const secondaryArticles = useMemo(() => displayArticles.slice(1, PAGE_SIZE.HOME), [displayArticles]);

  // ===================================================================
  // C区 - 渲染：纯声明式渲染
  // ===================================================================

  // 卫语句：加载状态
  if (isLoading && articles.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Featured</h2>
        <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading articles…
        </div>
      </div>
    );
  }

  // 卫语句：错误状态
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Featured</h2>
        <div className="flex h-96 items-center justify-center text-destructive">
          Error loading articles: {error}
        </div>
      </div>
    );
  }


  // 主要渲染
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
      {/* 主内容区 */}
      <div className="min-w-0">
        {/* 标题 + 搜索 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Featured</h2>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={handleSearchInput}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              placeholder="Search articles…"
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}

            {/* 搜索结果下拉 */}
            {showSearchResults && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Searching…
                  </div>
                ) : searchResults.length > 0 ? (
                  <ul className="py-1">
                    {searchResults.map((article) => (
                      <li key={article.id}>
                        <button
                          type="button"
                          onMouseDown={() => handleArticleClick(article.id)}
                          className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-accent"
                        >
                          <span className="line-clamp-1 text-sm font-medium text-foreground">{article.title}</span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">{article.excerpt}</span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{article.category}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : searchQuery.trim() ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
                    <FileSearch className="size-8 opacity-50" />
                    No articles found for “{searchQuery}”
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 特色文章 */}
        {featuredArticles.length > 0 && (
          <div className="mb-6">
            {featuredArticles.map((article) => (
              <BlogCard key={article.id} {...article} featured onClick={handleArticleClick} />
            ))}
          </div>
        )}

        {/* 次要文章网格 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {secondaryArticles.slice(0, 6).map((article) => (
            <BlogCard key={article.id} {...article} onClick={handleArticleClick} />
          ))}
        </div>

        {/* 查看更多 */}
        <div className="mt-10 flex justify-center">
          <Button size="lg" onClick={handleSeeMoreArticles}>
            See More Articles
          </Button>
        </div>
      </div>

      {/* 右侧边栏 */}
      <aside className="space-y-6">
        <AuthorCard />

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Server</h3>
              <span className="ml-auto flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    serverStatus?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                />
                <span className={serverStatus?.status === 'healthy' ? 'text-muted-foreground' : 'text-destructive'}>
                  {serverStatus?.status === 'healthy' ? 'Online' : 'Offline'}
                </span>
              </span>
            </div>

            {serverStatus ? (
              <div className="space-y-3">
                <StatusMetric
                  icon={<MemoryStick className="size-3.5 text-muted-foreground" />}
                  label="Memory"
                  value={serverStatus.checks.memory.details.usage_percent}
                />
                <StatusMetric
                  icon={<Cpu className="size-3.5 text-muted-foreground" />}
                  label="CPU"
                  value={serverStatus.metrics.cpu_usage_percent}
                />
                <StatusMetric
                  icon={<HardDrive className="size-3.5 text-muted-foreground" />}
                  label="Disk"
                  value={serverStatus.checks.disk.details.usage_percent}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading server status…</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
};

export default Home;