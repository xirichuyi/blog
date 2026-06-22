import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw, Filter, X, Folder, Tag as TagIcon, CheckCircle, ChevronDown } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { apiService } from '../../services/api';
import type { Article, Category, Tag } from '../../services/types';
import MobileArticleCard from '../../components/ui/ArticleCard/MobileArticleCard';
import './MobileArticles.css';

const ARTICLES_PER_PAGE = 10;

interface FilterState {
  type: 'category' | 'tag' | null;
  id: string | null;
  name: string | null;
}

const MobileArticles: React.FC = () => {
  const navigate = useNavigate();

  // 状态管理
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterState>({
    type: null,
    id: null,
    name: null
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // 渐变色
  const gradients = useMemo(() => [
    "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)",
    "linear-gradient(135deg, #B8C5D1 0%, #D6E3F0 100%)",
    "linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)",
    "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
    "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",
    "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
    "linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)"
  ], []);

  // 加载数据
  const loadData = useCallback(async (page: number = 1, filter: FilterState = activeFilter) => {
    try {
      setIsLoading(true);
      setError(null);

      let articlesData: Article[] = [];
      let total = 0;

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

      setArticles(articlesData);
      setTotalArticles(total);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  // 初始化
  useEffect(() => {
    const initialize = async () => {
      try {
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

        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      }
    };

    initialize();
  }, [loadData]);

  // 筛选处理
  const handleFilter = useCallback((type: 'category' | 'tag' | null, id: string | null, name: string | null) => {
    const newFilter = { type, id, name };
    setActiveFilter(newFilter);
    setCurrentPage(1);
    loadData(1, newFilter);
    setShowFilterSheet(false);
  }, [loadData]);

  // 文章点击
  const handleArticleClick = useCallback((articleId: string) => {
    navigate(`/article/${articleId}`);
  }, [navigate]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    if ((currentPage * ARTICLES_PER_PAGE) < totalArticles) {
      loadData(nextPage);
    }
  }, [currentPage, totalArticles, loadData]);

  // 渐变色生成
  const getGradientForIndex = useCallback((index: number): string => {
    return gradients[index % gradients.length];
  }, [gradients]);

  // 数据转换
  const displayArticles = useMemo(() =>
    articles.map((article, index) => {
      // 清理描述文本
      let description = article.excerpt || '';
      if (!description && article.content) {
        description = article.content
          .replace(/```[\s\S]*?```/g, '')
          .replace(/`[^`]*`/g, '')
          .replace(/[#*_[\]()]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 120);
      }
      
      return {
        id: article.id,
        title: article.title,
        description: description ? description + '...' : 'No description available',
        date: new Date(article.publishDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        tag: article.category || 'Article',
        coverImage: article.coverImage || article.imageUrl,
        gradient: getGradientForIndex(index)
      };
    }), [articles, getGradientForIndex]
  );

  // 是否有更多
  const hasMore = (currentPage * ARTICLES_PER_PAGE) < totalArticles;

  if (isLoading && articles.length === 0) {
    return (
      <div className="mobile-articles">
        <div className="mobile-articles-loading">
          <Loader2 className="loading-spinner" size={32} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-articles">
        <div className="mobile-articles-error">
          <AlertCircle className="error-icon" size={48} />
          <p>{error}</p>
          <button className="apple-button-base apple-button-primary" onClick={() => loadData()}>
            <RefreshCw size={18} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-articles">
      {/* Toolbar - Compact and Business Style */}
      <div className="mobile-articles-toolbar">
        <div className="mobile-toolbar-row">
          <span className="mobile-articles-count">{totalArticles} Articles</span>
          
          <button
            className="mobile-filter-button"
            onClick={() => setShowFilterSheet(true)}
            aria-label="Filter articles"
          >
            <Filter size={20} />
          </button>
        </div>

        {/* Active Filter Chip */}
        {activeFilter.type && (
          <div className="mobile-active-filter">
            <button
              className="mobile-filter-chip active"
              onClick={() => handleFilter(null, null, null)}
            >
              {activeFilter.type === 'category' ? <Folder size={14} /> : <TagIcon size={14} />}
              <span>{activeFilter.name || 'Filter'}</span>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Articles List */}
      <div className="mobile-articles-content">
        <div className="mobile-articles-list">
          {displayArticles.map((article) => (
            <MobileArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              description={article.description}
              date={article.date}
              tag={article.tag}
              coverImage={article.coverImage}
              gradient={article.gradient}
              onClick={handleArticleClick}
            />
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="mobile-load-more">
            <button 
              className="apple-button-base apple-button-outline"
              onClick={handleLoadMore}
            >
              Load More
              <ChevronDown size={18} />
            </button>
          </div>
        )}

        {/* End of List */}
        {!hasMore && articles.length > 0 && (
          <div className="mobile-articles-end">
            <CheckCircle size={20} />
            <span>That's all</span>
          </div>
        )}
      </div>

      {/* Filter Sheet - Radix UI Dialog */}
      <Dialog.Root open={showFilterSheet} onOpenChange={setShowFilterSheet}>
        <Dialog.Portal>
          <Dialog.Overlay className="mobile-filter-overlay" />
          <Dialog.Content className="mobile-filter-sheet">
            <div className="mobile-filter-header">
              <Dialog.Title className="mobile-filter-title">Filter</Dialog.Title>
              <Dialog.Close className="mobile-filter-close">
                <X size={20} />
              </Dialog.Close>
            </div>

            <div className="mobile-filter-content">
              {/* All */}
              <div className="mobile-filter-section">
                <h4 className="mobile-filter-section-title">All</h4>
                <div className="mobile-filter-chips">
                  <button
                    className={`mobile-filter-chip ${!activeFilter.type ? 'selected' : ''}`}
                    onClick={() => handleFilter(null, null, null)}
                  >
                    <Folder size={16} />
                    <span>All Articles ({totalArticles})</span>
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="mobile-filter-section">
                <h4 className="mobile-filter-section-title">Categories</h4>
                <div className="mobile-filter-chips">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      className={`mobile-filter-chip ${activeFilter.type === 'category' && activeFilter.id === category.id ? 'selected' : ''}`}
                      onClick={() => handleFilter('category', category.id, category.name)}
                    >
                      <Folder size={16} />
                      <span>{category.name} ({category.count || 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="mobile-filter-section">
                <h4 className="mobile-filter-section-title">Tags</h4>
                <div className="mobile-filter-chips">
                  {tags.slice(0, 15).map((tag) => (
                    <button
                      key={tag.id}
                      className={`mobile-filter-chip ${activeFilter.type === 'tag' && activeFilter.id === tag.id ? 'selected' : ''}`}
                      onClick={() => handleFilter('tag', tag.id, tag.name)}
                    >
                      <TagIcon size={16} />
                      <span>{tag.name} ({tag.count || 0})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default MobileArticles;
