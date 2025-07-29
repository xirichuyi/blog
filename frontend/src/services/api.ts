import axios from 'axios';
import type { BlogPost, BlogPostsResponse, Message, AdminDashboardData } from '../types/blog';
import { mockApi, shouldUseMockData } from './mockData';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 缓存管理
class ApiCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

  set(key: string, data: unknown, ttl: number = 300000) { // 默认5分钟TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  invalidate(pattern?: string) {
    if (pattern) {
      // 删除匹配模式的缓存
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清空所有缓存
      this.cache.clear();
    }
  }

  invalidateAll() {
    this.cache.clear();
  }
}

const apiCache = new ApiCache();

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('blogAdminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 处理认证错误
    if (error.response?.status === 401) {
      // 清除无效token
      localStorage.removeItem('blogAdminToken');
      // 可以在这里添加重定向到登录页面的逻辑
    }

    // 记录详细错误信息用于调试
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method
      });
    } else if (error.request) {
      console.error('API Network Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url
      });
    }

    return Promise.reject(error);
  }
);

// 博客相关API
export const blogApi = {
  // 获取所有文章（带分页）
  async getPosts(page: number = 1, limit: number = 6): Promise<BlogPostsResponse> {
    const cacheKey = `posts-${page}-${limit}`;

    // 检查缓存
    const cached = apiCache.get<BlogPostsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get(`/posts?page=${page}&limit=${limit}`);
      const data = response.data;

      // 缓存结果
      apiCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return mockApi.getPosts(page, limit);
    }
  },

  // 根据slug获取单篇文章
  async getPostBySlug(slug: string): Promise<BlogPost> {
    const cacheKey = `post-${slug}`;

    // 检查缓存
    const cached = apiCache.get<BlogPost>(cacheKey);
    if (cached) {
      return cached;
    }

    if (shouldUseMockData()) {
      const post = await mockApi.getPostBySlug(slug);
      if (!post) throw new Error('Post not found');
      return post;
    }
    try {
      const response = await apiClient.get(`/posts/${slug}`);
      const data = response.data;

      // 缓存结果
      apiCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      const post = await mockApi.getPostBySlug(slug);
      if (!post) throw error;
      return post;
    }
  },

  // 搜索文章
  async searchPosts(query: string): Promise<BlogPost[]> {
    if (shouldUseMockData()) {
      return mockApi.searchPosts(query);
    }
    try {
      const response = await apiClient.get(`/posts?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return mockApi.searchPosts(query);
    }
  },

  // 获取所有分类
  async getCategories(): Promise<string[]> {
    const cacheKey = 'categories';

    // 检查缓存
    const cached = apiCache.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (shouldUseMockData()) {
      return mockApi.getCategories();
    }
    try {
      const response = await apiClient.get('/categories');
      const data = response.data;

      // 缓存结果
      apiCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return mockApi.getCategories();
    }
  },

  // 根据分类获取文章
  async getPostsByCategory(category: string): Promise<BlogPost[]> {
    if (shouldUseMockData()) {
      return mockApi.getPostsByCategory(category);
    }
    try {
      const response = await apiClient.get(`/categories/${category}`);
      return response.data;
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return mockApi.getPostsByCategory(category);
    }
  },
};

// 聊天相关API
export const chatApi = {
  // 发送聊天消息
  async sendMessage(message: string, conversationHistory?: Message[]): Promise<string> {
    if (shouldUseMockData()) {
      return mockApi.sendMessage(message);
    }
    try {
      const response = await apiClient.post('/chat', {
        message,
        conversationHistory: conversationHistory?.slice(-5), // 只发送最近5条消息
      });
      return response.data.response;
    } catch (error) {
      console.warn('Chat API call failed, falling back to mock response:', error);
      return mockApi.sendMessage(message);
    }
  },
};

// 管理员相关API
export const adminApi = {
  // 获取仪表板数据
  async getDashboardData(): Promise<AdminDashboardData> {
    if (shouldUseMockData()) {
      return mockApi.getDashboardData();
    }
    try {
      const response = await apiClient.get('/admin/dashboard');
      return response.data.data;
    } catch (error) {
      console.warn('Admin API call failed, falling back to mock data:', error);
      return mockApi.getDashboardData();
    }
  },

  // 获取所有文章（管理员视图）
  async getAllPosts(): Promise<BlogPostsResponse> {
    try {
      const response = await apiClient.get('/admin/posts');
      return response.data;
    } catch (error) {
      console.warn('Admin getAllPosts API call failed, falling back to mock data:', error);
      // 回退到mock数据
      return mockApi.getPosts(1, 100); // 获取所有mock文章
    }
  },

  // 获取单个文章（管理员视图）
  async getPost(slug: string): Promise<BlogPost> {
    const response = await apiClient.get(`/admin/posts/${slug}`);
    return response.data;
  },

  // 创建新文章
  async createPost(postData: Omit<BlogPost, 'id'> & { content: string }): Promise<{ success: boolean; message?: string; post?: BlogPost }> {
    const response = await apiClient.post('/admin/posts', postData);

    // 清理相关缓存
    apiCache.invalidate('posts-'); // 清理文章列表缓存
    apiCache.invalidate('categories'); // 清理分类缓存

    return response.data;
  },

  // 更新文章
  async updatePost(slug: string, postData: Partial<BlogPost> & { content?: string }): Promise<{ success: boolean; message?: string; post?: BlogPost }> {
    const response = await apiClient.put(`/admin/posts/${slug}`, postData);

    // 清理相关缓存
    apiCache.invalidate('posts-'); // 清理文章列表缓存
    apiCache.invalidate(`post-${slug}`); // 清理特定文章缓存
    apiCache.invalidate('categories'); // 清理分类缓存

    return response.data;
  },

  // 删除文章
  async deletePost(slug: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/admin/posts/${slug}`);

    // 清理相关缓存
    apiCache.invalidate('posts-'); // 清理文章列表缓存
    apiCache.invalidate(`post-${slug}`); // 清理特定文章缓存
    apiCache.invalidate('categories'); // 清理分类缓存

    return response.data;
  },

  // AI助手
  async generateContent(prompt: string, type: string, deepseekApiKey?: string, deepseekModel?: string): Promise<string> {
    const response = await apiClient.post('/admin/ai-assist', {
      prompt,
      type,
      deepseekApiKey,
      deepseekModel,
    });
    return response.data.content;
  },

  // 管理员认证
  async login(token: string): Promise<boolean> {
    try {
      // 验证token
      const response = await apiClient.get('/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        localStorage.setItem('blogAdminToken', token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // 登出
  logout(): void {
    localStorage.removeItem('blogAdminToken');
  },

  // 检查是否已登录
  isAuthenticated(): boolean {
    return !!localStorage.getItem('blogAdminToken');
  },

  // 上传图片
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post('/admin/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
      }
    });

    return response.data.url;
  },

  // 获取系统状态
  async getSystemStatus(): Promise<{
    serverStatus: string;
    databaseStatus: string;
    storageUsage: number;
    lastUpdated: string;
    uptime: number;
    version: string;
    metrics?: object;
  }> {
    try {
      const response = await apiClient.get('/admin/system-status');
      return response.data.data;
    } catch (error) {
      console.warn('System status API call failed:', error);
      throw error;
    }
  },

  // 获取统计趋势
  async getStatsTrends(): Promise<{
    postsGrowth: number;
    categoriesGrowth: number;
    publishedGrowth: number;
    viewsToday: number;
    viewsGrowth: number;
  }> {
    try {
      const response = await apiClient.get('/admin/stats-trends');
      return response.data.data;
    } catch (error) {
      console.warn('Stats trends API call failed:', error);
      throw error;
    }
  },
};

// 导出缓存管理功能
export const cacheManager = {
  // 清理所有缓存
  clearAll: () => apiCache.invalidateAll(),

  // 清理文章相关缓存
  clearPosts: () => {
    apiCache.invalidate('posts-');
    apiCache.invalidate('post-');
  },

  // 清理分类缓存
  clearCategories: () => apiCache.invalidate('categories'),

  // 清理特定文章缓存
  clearPost: (slug: string) => apiCache.invalidate(`post-${slug}`),

  // 清理文章列表缓存
  clearPostsList: () => apiCache.invalidate('posts-')
};

export default apiClient;
