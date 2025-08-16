import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type {
  Article,
  Category,
  Tag,
  BlogDataState,
  UseBlogDataReturn
} from '../types';

// Re-export types for convenience
export type { Article, Category, Tag };

// Hook implementation
const useBlogData = (): UseBlogDataReturn => {
  const [state, setState] = useState<BlogDataState>({
    articles: [],
    categories: [],
    tags: [],
    isLoading: false,
    error: null
  });

  const fetchArticles = useCallback(async (page: number = 1, pageSize: number = 12) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 使用后端分页功能，只获取已发布的文章
      const response = await apiService.getPosts({
        page,
        page_size: pageSize,
        status: 'published'
      });
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          articles: response.data,
          isLoading: false
        }));

        // 返回分页信息
        return {
          articles: response.data,
          total: response.total || response.data.length,
          page: response.page || page,
          pageSize: response.page_size || pageSize
        };
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch articles',
          isLoading: false
        }));
        return null;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch articles',
        isLoading: false
      }));
      return null;
    }
  }, []);

  const fetchArticleById = useCallback(async (id: string): Promise<Article | null> => {
    try {
      const response = await apiService.getPost(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        console.error('Failed to fetch article:', response.error);
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch article:', error);
      return null;
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.getPublicCategories();
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          categories: response.data,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch categories',
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
        isLoading: false
      }));
    }
  }, []);

  const fetchTags = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.getPublicTags();
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          tags: response.data,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch tags',
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
        isLoading: false
      }));
    }
  }, []);

  const fetchArticlesByCategory = useCallback(async (categoryId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.getPostsByCategory(categoryId);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          articles: response.data,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch articles by category',
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch articles by category',
        isLoading: false
      }));
    }
  }, []);

  const fetchArticlesByTag = useCallback(async (tagName: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.getPostsByTag(tagName);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          articles: response.data,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to fetch articles by tag',
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch articles by tag',
        isLoading: false
      }));
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchArticles(1, 12), fetchCategories(), fetchTags()]);
  }, [fetchArticles, fetchCategories, fetchTags]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    ...state,
    fetchArticles,
    fetchArticleById,
    fetchCategories,
    fetchTags,
    fetchArticlesByCategory,
    fetchArticlesByTag,
    refreshData
  };
};

export default useBlogData;