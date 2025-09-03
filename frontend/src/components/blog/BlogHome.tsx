import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BlogHome.css';
import RadioCard from '../music/RadioCard';
import AuthorCard from './AuthorCard';
import { CustomButton } from '../ui/CustomButton';

import { useData } from '../../contexts/DataContext';
import { apiService } from '../../services/api';
import type { Article } from '../../types';

// 服务器状态接口 - 匹配后端API结构
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

const BlogHome: React.FC = () => {
  const navigate = useNavigate();
  const { articles, isLoading, error, fetchArticles } = useData();

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  // 服务器状态
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverStatusLoading, setServerStatusLoading] = useState(true);

  // 加载文章数据
  useEffect(() => {
    if (articles.length === 0 && !isLoading) {
      fetchArticles(1, 7); // 首页显示前7篇文章
    }
  }, [articles.length, isLoading, fetchArticles]);

  // 加载所有文章用于搜索
  useEffect(() => {
    const loadAllArticles = async () => {
      try {
        const result = await fetchArticles(1, 1000); // 加载所有文章用于搜索
        if (result) {
          setAllArticles(result.articles);
        }
      } catch (err) {
        console.error('Failed to load articles for search:', err);
      }
    };

    if (allArticles.length === 0) {
      loadAllArticles();
    }
  }, [fetchArticles, allArticles.length]);

  // 获取服务器状态数据
  useEffect(() => {
    const fetchServerStatus = async () => {
      try {
        setServerStatusLoading(true);
        const response = await apiService.detailedHealthCheck();
        if (response.success && response.data) {
          setServerStatus(response.data);
        } else {
          console.error('Failed to fetch server status:', response.error);
        }
      } catch (error) {
        console.error('Error fetching server status:', error);
      } finally {
        setServerStatusLoading(false);
      }
    };

    // 初始加载
    fetchServerStatus();

    // 每5分钟更新一次 (300秒)
    const interval = setInterval(fetchServerStatus, 300000);

    return () => clearInterval(interval);
  }, []);

  // 处理文章点击
  const handleArticleClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
    // 如果是从搜索结果点击的，关闭搜索下拉窗口并清空搜索框
    if (showSearchResults) {
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  // 处理搜索
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // 模拟搜索延迟
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

      // 按日期排序（最新的在前）
      results.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

      setSearchResults(results.slice(0, 5)); // 只显示前5个结果
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // 搜索输入变化时触发搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300); // 防抖

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allArticles]);



  // 生成渐变色的辅助函数
  const getGradientForIndex = (index: number): string => {
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
  };

  // 转换真实文章数据为显示格式
  const convertArticleToDisplayFormat = (article: Article, index: number) => {
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
      imageCollage: index === 0 ? [
        { type: 'app-ui', color: '#6750A4' },
        { type: 'design-system', color: '#7C4DFF' },
        { type: 'components', color: '#9C27B0' },
        { type: 'mobile-ui', color: '#673AB7' }
      ] : undefined,
      coverImage: article.coverImage || article.imageUrl
    };
  };

  // 如果正在加载，显示加载状态
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

  // 如果有错误，显示错误状态
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

  // 转换文章数据
  const displayArticles = articles.slice(0, 7).map((article, index) =>
    convertArticleToDisplayFormat(article, index)
  );

  // 分配帖子到不同区域
  const featuredArticles = displayArticles.slice(0, 1); // 第1个帖子
  const secondaryArticles = displayArticles.slice(1, 7); // 第2-7个帖子都使用secondary样式



  return (
    <div className="blog-home">

      <div className="blog-main-content">
        {/* Featured Section Header with Search */}
        <div className="section-header">
          <h2 className="section-title">Featured</h2>
          <div className="search-container" style={{ position: 'relative' }}>
            <md-outlined-text-field
              label="Search articles..."
              value={searchQuery}
              onInput={(e: any) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              style={{ width: '300px' }}
            >
              <md-icon slot="leading-icon">search</md-icon>
              {searchQuery && (
                <md-icon-button
                  slot="trailing-icon"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  aria-label="Clear search"
                >
                  <md-icon>close</md-icon>
                </md-icon-button>
              )}
            </md-outlined-text-field>

            {/* 搜索结果下拉窗口 */}
            {showSearchResults && (
              <div
                className="search-results-dropdown"
                style={{
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
                }}
              >
                {isSearching ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <md-circular-progress indeterminate style={{ "--md-circular-progress-size": "24px" }}></md-circular-progress>
                    <div style={{ marginTop: '8px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      Searching...
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {searchResults.map((article, index) => (
                      <md-list-item
                        key={article.id}
                        type="button"
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

        {/* Main Content Grid */}
        <section className="blog-featured-section">
          <div className="blog-featured-grid">
            {/* Left side - Featured Article */}
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
                {/* Left side - Featured article image */}
                <div className="featured-article-image-area">
                  {article.coverImage ? (
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="featured-article-image"
                      onError={(e) => {
                        // 如果图片加载失败，显示渐变背景
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.background = article.gradient;
                          parent.innerHTML = `
                            <div class="featured-fallback-content">
                              <div class="fallback-icon">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                  <path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                              </div>
                              <p class="fallback-text">${article.title}</p>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div
                      className="featured-article-fallback"
                      style={{ background: article.gradient }}
                    >
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

                {/* Right side - Content area */}
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

          {/* Right side - Secondary Articles Grid */}
          <div className="blog-secondary-grid">
            {secondaryArticles.slice(0, 4).map((article) => (
              <div
                key={article.id}
                className="secondary-article-card"
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
                {/* 上方图片区域 */}
                <div className="secondary-article-image">
                  {article.coverImage ? (
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="secondary-article-img"
                      onError={(e) => {
                        // 如果图片加载失败，显示渐变背景
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.background = article.gradient;
                          parent.innerHTML = `
                            <div class="secondary-fallback-content">
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
                    <div
                      className="secondary-article-fallback"
                      style={{ background: article.gradient }}
                    >
                      <div className="secondary-fallback-content">
                        <div className="fallback-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* 下方内容区域 */}
                <div className="secondary-article-content">
                  <div className="secondary-article-meta">
                    <span className="secondary-article-tag">{article.tag}</span>
                    <span className="secondary-article-date">{article.date}</span>
                  </div>
                  <h3 className="secondary-article-title">{article.title}</h3>
                  <p className="secondary-article-description">{article.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* See More Articles Button */}
        <div className="see-more-section">
          <CustomButton
            variant="filled"
            size="large"
            className="see-more-button"
            onClick={() => navigate('/articles')}
          >
            See More Articles
          </CustomButton>
        </div>

      </div>

      {/* Right Sidebar */}
      <aside className="blog-sidebar">
        {/* Author Card Section - 移到最上方 */}
        <div className="sidebar-section">
          <AuthorCard />
        </div>

        {/* Server Status Section - 简化版本 */}
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
                {/* Memory Usage */}
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

                {/* CPU Usage */}
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

                {/* Disk Usage */}
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

        {/* Radio Card Section
        <div className="sidebar-section">
          <RadioCard />
        </div> */}
      </aside>
    </div>
  );
};

export default BlogHome;
