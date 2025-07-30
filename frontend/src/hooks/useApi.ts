/**
 * API 相关的自定义 Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { blogApi, adminApi } from '@/services/api';
import { errorUtils } from '@/utils/common';
import type { BlogPost, BlogPostsResponse, AdminDashboardData } from '@/types/blog';

/**
 * 通用 API 状态管理 Hook
 */
export const useApiState = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
    setError,
  };
};

/**
 * 博客文章列表 Hook
 */
export const usePosts = (page: number = 1, limit: number = 10) => {
  const { data, loading, error, execute, setData } = useApiState<BlogPostsResponse>();

  const fetchPosts = useCallback(() => {
    return execute(() => blogApi.getPosts(page, limit));
  }, [execute, page, limit]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const refetch = useCallback(() => {
    return fetchPosts();
  }, [fetchPosts]);

  return {
    posts: data?.posts || [],
    totalPosts: data?.totalPosts || 0,
    totalPages: data?.totalPages || 0,
    loading,
    error,
    refetch,
    setData,
  };
};

/**
 * 单个博客文章 Hook
 */
export const usePost = (slug: string | undefined) => {
  const { data, loading, error, execute } = useApiState<BlogPost>();

  const fetchPost = useCallback(() => {
    if (!slug) return Promise.resolve(null);
    return execute(() => blogApi.getPostBySlug(slug));
  }, [execute, slug]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return {
    post: data,
    loading,
    error,
    refetch: fetchPost,
  };
};

/**
 * 分类列表 Hook
 */
export const useCategories = () => {
  const { data, loading, error, execute } = useApiState<string[]>();

  const fetchCategories = useCallback(() => {
    return execute(() => blogApi.getCategories());
  }, [execute]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories: data || [],
    loading,
    error,
    refetch: fetchCategories,
  };
};

/**
 * 分类下的文章 Hook
 */
export const useCategoryPosts = (category: string | undefined) => {
  const { data, loading, error, execute } = useApiState<BlogPost[]>();

  const fetchCategoryPosts = useCallback(() => {
    if (!category) return Promise.resolve([]);
    return execute(() => blogApi.getPostsByCategory(category));
  }, [execute, category]);

  useEffect(() => {
    fetchCategoryPosts();
  }, [fetchCategoryPosts]);

  return {
    posts: data || [],
    loading,
    error,
    refetch: fetchCategoryPosts,
  };
};

/**
 * 管理员仪表板数据 Hook
 */
export const useAdminDashboard = () => {
  const { data, loading, error, execute } = useApiState<AdminDashboardData>();

  const fetchDashboardData = useCallback(() => {
    return execute(() => adminApi.getDashboardData());
  }, [execute]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    dashboardData: data,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};

/**
 * 文章操作 Hook
 */
export const usePostOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (postData: Partial<BlogPost>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await adminApi.createPost(postData);
      return result;
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePost = useCallback(async (slug: string, postData: Partial<BlogPost>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await adminApi.updatePost(slug, postData);
      return result;
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await adminApi.deletePost(slug);
      return result;
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createPost,
    updatePost,
    deletePost,
    loading,
    error,
  };
};

/**
 * 图片上传 Hook
 */
export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const imageUrl = await adminApi.uploadImage(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      return imageUrl;
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, []);

  return {
    uploadImage,
    uploading,
    progress,
    error,
  };
};

/**
 * 搜索 Hook
 */
export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 这里可以实现实际的搜索 API 调用
      // 目前使用模拟搜索
      const allPosts = await blogApi.getPosts(1, 100);
      const filteredPosts = allPosts.posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.categories.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      setResults(filteredPosts);
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clearSearch,
  };
};
