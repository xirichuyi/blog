import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './style.css';
import AuthorCard from './components/AuthorCard';
import { CustomButton } from '../../components/ui/CustomButton';
import ArticleCard from '../../components/ui/ArticleCard';
import { apiService } from '../../services/api';
import type { Article } from '../../services/types';
import { logger } from '../../utils/logger';

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

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  // 服务器状态
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverStatusLoading, setServerStatusLoading] = useState(true);

  // 数据加载Hook
  const loadArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getArticles({
        page: 1,
        page_size: 7,
        status: 'published'
      });

      if (response.success && response.data) {
        setArticles(response.data);
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
    const interval = setInterval(fetchServerStatus, 300000); // 每5分钟更新
    return () => clearInterval(interval);
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

  // 组件卸载时清理timer - 必须在所有条件语句之前声明
  useEffect(() => {
    return () => {
      if (searchBlurTimerRef.current) {
        clearTimeout(searchBlurTimerRef.current);
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

  // 渐变色数组 - 使用useMemo避免重复创建
  const gradients = useMemo(() => [
    "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)",
    "linear-gradient(135deg, #B8C5D1 0%, #D6E3F0 100%)",
    "linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)",
    "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
    "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",
    "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
    "linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)"
  ], []);

  // 渐变色生成
  const getGradientForIndex = useCallback((index: number): string => {
    return gradients[index % gradients.length];
  }, [gradients]);

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
  }, [getGradientForIndex]);

  // 数据准备 - 使用useMemo避免不必要的重复计算（必须在条件渲染之前）
  const displayArticles = useMemo(() =>
    articles.slice(0, 7).map((article, index) =>
      convertArticleToDisplayFormat(article, index)
    ), [articles, convertArticleToDisplayFormat]
  );

  const featuredArticles = useMemo(() => displayArticles.slice(0, 1), [displayArticles]);
  const secondaryArticles = useMemo(() => displayArticles.slice(1, 7), [displayArticles]);

  // ===================================================================
  // C区 - 渲染：纯声明式渲染
  // ===================================================================

  // 卫语句：加载状态
  if (isLoading && articles.length === 0) {
    return (
      <div className="blog-home">
        <div className="blog-main-content">
          <div className="section-header">
            <h2 className="section-title">Featured</h2>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px',
            color: '#e8eaed'
          }}>
            Loading articles...
          </div>
        </div>
      </div>
    );
  }

  // 卫语句：错误状态
  if (error) {
    return (
      <div className="blog-home">
        <div className="blog-main-content">
          <div className="section-header">
            <h2 className="section-title">Featured</h2>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px',
            color: '#f28b82'
          }}>
            Error loading articles: {error}
          </div>
        </div>
      </div>
    );
  }


  // 主要渲染
  return (
    <div className="blog-home">
      <div className="blog-main-content">
        {/* 页面标题和搜索 */}
        <div className="section-header">
          <h2 className="section-title">Featured</h2>
          <div className="search-container" style={{ position: 'relative' }}>
            <md-outlined-text-field
              label="Search articles..."
              value={searchQuery}
              onInput={handleSearchInput}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              style={{ width: '300px' }}
            >
              <md-icon slot="leading-icon">search</md-icon>
              {searchQuery && (
                <md-icon-button
                  slot="trailing-icon"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <md-icon>close</md-icon>
                </md-icon-button>
              )}
            </md-outlined-text-field>

            {/* 搜索结果下拉 */}
            {showSearchResults && (
              <div className="search-results-dropdown" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: 'var(--md-sys-color-surface-container)',
                borderRadius: '12px',
                marginTop: '4px',
                maxHeight: '400px',
                overflowY: 'auto',
                boxShadow: 'var(--md-sys-elevation-level3)'
              }}>
                {isSearching ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <md-circular-progress indeterminate style={{ '--md-circular-progress-size': '24px' } as React.CSSProperties}></md-circular-progress>
                    <div style={{ marginTop: '8px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      Searching...
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {searchResults.map((article, index) => (
                      <md-list-item
                        key={article.id}
                        onClick={() => handleArticleClick(article.id)}
                        style={{
                          cursor: 'pointer',
                          borderBottom: index < searchResults.length - 1 ? '1px solid var(--md-sys-color-outline-variant)' : 'none'
                        }}
                      >
                        <div slot="headline" style={{ fontWeight: '500' }}>
                          {article.title}
                        </div>
                        <div slot="supporting-text" style={{
                          color: 'var(--md-sys-color-on-surface-variant)',
                          fontSize: '0.875rem',
                          lineHeight: '1.25rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {article.excerpt}
                        </div>
                        <div slot="trailing-supporting-text" style={{
                          color: 'var(--md-sys-color-primary)',
                          fontSize: '0.75rem'
                        }}>
                          {article.category}
                        </div>
                        <md-icon slot="start">article</md-icon>
                      </md-list-item>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    <md-icon style={{ fontSize: '48px', opacity: 0.5 }}>search_off</md-icon>
                    <div style={{ marginTop: '8px' }}>
                      No articles found for "{searchQuery}"
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 主要内容网格 */}
        <section className="blog-featured-section">
          <div className="blog-featured-grid">
            {/* 特色文章 */}
            {featuredArticles.map((article) => (
              <div
                key={article.id}
                className="featured-article-card"
                onClick={() => handleArticleClick(article.id)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleArticleClick(article.id);
                  }
                }}
              >
                <div className="featured-article-image-area">
                  {article.coverImage ? (
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="featured-article-image"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // XSS fix: Don't use innerHTML, update the article state instead
                        setArticles(prev => prev.map(a =>
                          a.id === article.id ? { ...a, coverImage: null } : a
                        ));
                      }}
                    />
                  ) : (
                    <div className="featured-article-fallback" style={{ background: article.gradient }}>
                      <div className="featured-fallback-content">
                        <div className="fallback-icon">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                            <path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <p className="fallback-text">{article.title}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="featured-article-content">
                  <div className="featured-article-meta">
                    <span className="featured-article-date">{article.date}</span>
                  </div>
                  <h2 className="featured-article-title">{article.title}</h2>
                  <p className="featured-article-description">{article.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 次要文章网格 */}
          <div className="blog-secondary-grid">
            {secondaryArticles.slice(0, 4).map((article) => (
              <ArticleCard
                key={article.id}
                id={article.id}
                title={article.title}
                description={article.description}
                date={article.date}
                tag={article.tag}
                coverImage={article.coverImage}
                gradient={article.gradient}
                onClick={handleArticleClick}
                variant="default"
              />
            ))}
          </div>
        </section>

        {/* 查看更多按钮 */}
        <div className="see-more-section">
          <CustomButton
            variant="filled"
            size="large"
            className="see-more-button"
            onClick={handleSeeMoreArticles}
          >
            See More Articles
          </CustomButton>
        </div>
      </div>

      {/* 右侧边栏 */}
      <aside className="blog-sidebar">
        <div className="sidebar-section">
          <AuthorCard />
        </div>

        <div className="sidebar-section">
          <div className="server-status-card">
            <div className="server-status-header">
              <md-icon className="server-status-icon">dns</md-icon>
              <h3 className="server-status-title">Server</h3>
              <div className="server-status-indicator">
                <div className={`status-dot ${serverStatus?.status === 'healthy' ? 'status-online' : 'status-offline'}`}></div>
                <span className={`status-text ${serverStatus?.status === 'healthy' ? '' : 'status-error'}`}>
                  {serverStatus?.status === 'healthy' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {serverStatus ? (
              <div className="server-metrics">
                <div className="metric-item">
                  <div className="metric-header">
                    <md-icon className="metric-icon">memory</md-icon>
                    <span className="metric-label">Memory</span>
                    <span className="metric-value">{serverStatus.checks.memory.details.usage_percent.toFixed(0)}%</span>
                  </div>
                  <md-linear-progress
                    value={serverStatus.checks.memory.details.usage_percent / 100}
                    className="memory-progress"
                  ></md-linear-progress>
                </div>

                <div className="metric-item">
                  <div className="metric-header">
                    <md-icon className="metric-icon">developer_board</md-icon>
                    <span className="metric-label">CPU</span>
                    <span className="metric-value">{serverStatus.metrics.cpu_usage_percent.toFixed(0)}%</span>
                  </div>
                  <md-linear-progress
                    value={serverStatus.metrics.cpu_usage_percent / 100}
                    className="cpu-progress"
                  ></md-linear-progress>
                </div>

                <div className="metric-item">
                  <div className="metric-header">
                    <md-icon className="metric-icon">storage</md-icon>
                    <span className="metric-label">Disk</span>
                    <span className="metric-value">{serverStatus.checks.disk.details.usage_percent.toFixed(0)}%</span>
                  </div>
                  <md-linear-progress
                    value={serverStatus.checks.disk.details.usage_percent / 100}
                    className="disk-progress"
                  ></md-linear-progress>
                </div>
              </div>
            ) : (
              <div className="server-metrics">
                <div className="metric-loading">Loading server status...</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Home;