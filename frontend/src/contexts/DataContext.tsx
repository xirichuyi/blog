// Enhanced Data Context for managing all shared data with caching and deduplication

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import type { Category, Tag, Article, PaginationInfo } from '../types';

interface DataContextType {
  // Basic data
  categories: Category[];
  tags: Tag[];
  isLoading: boolean;
  error: string | null;

  // Article management
  articles: Article[];
  articlesLoading: boolean;
  articlesError: string | null;

  // Methods
  refreshData: () => Promise<void>;
  fetchArticles: (page?: number, pageSize?: number, options?: { status?: string }) => Promise<PaginationInfo | null>;
  fetchArticleById: (id: string) => Promise<Article | null>;
  fetchArticlesByCategory: (categoryId: string) => Promise<Article[]>;
  fetchArticlesByTag: (tagName: string) => Promise<Article[]>;

  // Cache management
  clearCache: () => void;
  getCachedArticle: (id: string) => Article | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

// Request deduplication helper
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear() {
    this.pendingRequests.clear();
  }
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Basic data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  // Cache and deduplication
  const deduplicator = useRef(new RequestDeduplicator());
  const articleCache = useRef(new Map<string, { article: Article; timestamp: number }>());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Load basic data (categories and tags)
  const loadBasicData = useCallback(async () => {
    return deduplicator.current.dedupe('basic-data', async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load categories and tags in parallel
        const [categoriesResponse, tagsResponse] = await Promise.all([
          apiService.getPublicCategories(),
          apiService.getPublicTags()
        ]);

        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        } else {
          console.error('Failed to load categories:', categoriesResponse.error);
        }

        if (tagsResponse.success && tagsResponse.data) {
          setTags(tagsResponse.data);
        } else {
          console.error('Failed to load tags:', tagsResponse.error);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  // Fetch articles with pagination
  const fetchArticles = useCallback(async (
    page: number = 1,
    pageSize: number = 12,
    options: { status?: string } = {}
  ): Promise<PaginationInfo | null> => {
    const cacheKey = `articles-${page}-${pageSize}-${options.status || 'published'}`;

    return deduplicator.current.dedupe(cacheKey, async () => {
      try {
        setArticlesLoading(true);
        setArticlesError(null);

        const response = await apiService.getPosts({
          page,
          page_size: pageSize,
          status: options.status || 'published'
        });

        if (response.success && response.data) {
          setArticles(response.data);

          // Cache individual articles
          response.data.forEach(article => {
            articleCache.current.set(article.id, {
              article,
              timestamp: Date.now()
            });
          });

          return {
            articles: response.data,
            total: response.total || response.data.length,
            page: response.page || page,
            pageSize: response.page_size || pageSize
          };
        } else {
          setArticlesError(response.error || 'Failed to fetch articles');
          return null;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch articles';
        setArticlesError(errorMessage);
        return null;
      } finally {
        setArticlesLoading(false);
      }
    });
  }, []);

  // Fetch single article by ID
  const fetchArticleById = useCallback(async (id: string): Promise<Article | null> => {
    // Check cache first
    const cached = articleCache.current.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.article;
    }

    return deduplicator.current.dedupe(`article-${id}`, async () => {
      try {
        const response = await apiService.getPost(id);
        if (response.success && response.data) {
          // Update cache
          articleCache.current.set(id, {
            article: response.data,
            timestamp: Date.now()
          });
          return response.data;
        }
        return null;
      } catch (error) {
        console.error('Failed to fetch article:', error);
        return null;
      }
    });
  }, []);

  // Fetch articles by category
  const fetchArticlesByCategory = useCallback(async (categoryId: string): Promise<Article[]> => {
    const cacheKey = `articles-category-${categoryId}`;

    return deduplicator.current.dedupe(cacheKey, async () => {
      try {
        setArticlesLoading(true);
        setArticlesError(null);

        const response = await apiService.getPostsByCategory(categoryId);
        if (response.success && response.data) {
          setArticles(response.data);

          // Cache individual articles
          response.data.forEach(article => {
            articleCache.current.set(article.id, {
              article,
              timestamp: Date.now()
            });
          });

          return response.data;
        } else {
          setArticlesError(response.error || 'Failed to fetch articles by category');
          return [];
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch articles by category';
        setArticlesError(errorMessage);
        return [];
      } finally {
        setArticlesLoading(false);
      }
    });
  }, []);

  // Fetch articles by tag
  const fetchArticlesByTag = useCallback(async (tagName: string): Promise<Article[]> => {
    const cacheKey = `articles-tag-${tagName}`;

    return deduplicator.current.dedupe(cacheKey, async () => {
      try {
        setArticlesLoading(true);
        setArticlesError(null);

        const response = await apiService.getPostsByTag(tagName);
        if (response.success && response.data) {
          setArticles(response.data);

          // Cache individual articles
          response.data.forEach(article => {
            articleCache.current.set(article.id, {
              article,
              timestamp: Date.now()
            });
          });

          return response.data;
        } else {
          setArticlesError(response.error || 'Failed to fetch articles by tag');
          return [];
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch articles by tag';
        setArticlesError(errorMessage);
        return [];
      } finally {
        setArticlesLoading(false);
      }
    });
  }, []);

  // Get cached article
  const getCachedArticle = useCallback((id: string): Article | null => {
    const cached = articleCache.current.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.article;
    }
    return null;
  }, []);

  // Clear all caches
  const clearCache = useCallback(() => {
    articleCache.current.clear();
    deduplicator.current.clear();
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    clearCache();
    await loadBasicData();
  }, [loadBasicData, clearCache]);

  // Initialize data on mount
  useEffect(() => {
    loadBasicData();
  }, [loadBasicData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      deduplicator.current.clear();
    };
  }, []);

  const value: DataContextType = {
    // Basic data
    categories,
    tags,
    isLoading,
    error,

    // Articles
    articles,
    articlesLoading,
    articlesError,

    // Methods
    refreshData,
    fetchArticles,
    fetchArticleById,
    fetchArticlesByCategory,
    fetchArticlesByTag,
    getCachedArticle,
    clearCache,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
