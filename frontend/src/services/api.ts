import axios from 'axios';
import type { BlogPost, BlogPostsResponse, Message, AdminDashboardData } from '../types/blog';

// API基础配置
const API_BASE_URL = 'http://localhost:3006/api';

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
}

const apiCache = new ApiCache();

// 缓存管理器导出
export const cacheManager = {
  invalidate: (pattern?: string) => apiCache.invalidate(pattern),
  clear: () => apiCache.invalidate(),
};

// 博客相关API
export const blogApi = {
  // 获取文章列表
  async getPosts(page: number = 1, limit: number = 10): Promise<BlogPostsResponse> {
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
      console.error('Failed to fetch posts:', error);
      throw new Error('无法连接到服务器，请检查网络连接或稍后重试');
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

    try {
      const response = await apiClient.get(`/posts/${slug}`);
      const data = response.data;

      // 缓存结果
      apiCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch post:', error);
      throw new Error('无法获取文章内容，请检查网络连接或稍后重试');
    }
  },

  // 搜索文章
  async searchPosts(query: string): Promise<BlogPost[]> {
    try {
      const response = await apiClient.get(`/posts?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Failed to search posts:', error);
      throw new Error('搜索失败，请检查网络连接或稍后重试');
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

    try {
      const response = await apiClient.get('/categories');
      const data = response.data;

      // 缓存结果
      apiCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw new Error('无法获取分类信息，请检查网络连接或稍后重试');
    }
  },

  // 根据分类获取文章
  async getPostsByCategory(category: string): Promise<BlogPost[]> {
    try {
      const response = await apiClient.get(`/categories/${category}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch posts by category:', error);
      throw new Error('无法获取分类文章，请检查网络连接或稍后重试');
    }
  },
};

// 聊天相关API
export const chatApi = {
  // 发送聊天消息
  async sendMessage(message: string, conversationHistory?: Message[]): Promise<string> {
    try {
      const response = await apiClient.post('/chat', {
        message,
        conversationHistory: conversationHistory?.slice(-5), // 只发送最近5条消息
      });
      return response.data.response;
    } catch (error) {
      console.error('Chat API call failed:', error);
      throw new Error('聊天服务暂时不可用，请稍后重试');
    }
  },
};

// 管理员相关API
export const adminApi = {
  // 获取仪表板数据
  async getDashboardData(): Promise<AdminDashboardData> {
    try {
      const response = await apiClient.get('/admin/dashboard');
      return response.data.data;
    } catch (error) {
      console.error('Admin API call failed:', error);
      throw new Error('无法获取管理员数据，请检查网络连接或稍后重试');
    }
  },

  // 获取所有文章（管理员视图）
  async getAllPosts(): Promise<BlogPostsResponse> {
    try {
      const response = await apiClient.get('/admin/posts');
      return response.data;
    } catch (error) {
      console.error('Admin getAllPosts API call failed:', error);
      throw new Error('无法获取文章列表，请检查网络连接或稍后重试');
    }
  },

  // 获取单个文章（管理员视图）
  async getPost(slug: string): Promise<BlogPost> {
    try {
      const response = await apiClient.get(`/admin/posts/${slug}`);
      return response.data;
    } catch (error) {
      console.error('Admin getPost API call failed:', error);
      throw new Error('无法获取文章详情，请检查网络连接或稍后重试');
    }
  },

  // 创建文章
  async createPost(post: Partial<BlogPost>): Promise<BlogPost> {
    try {
      const response = await apiClient.post('/admin/posts', post);
      // 清除相关缓存
      cacheManager.invalidate('posts');
      return response.data;
    } catch (error) {
      console.error('Admin createPost API call failed:', error);
      throw new Error('创建文章失败，请检查网络连接或稍后重试');
    }
  },

  // 更新文章
  async updatePost(slug: string, post: Partial<BlogPost>): Promise<BlogPost> {
    try {
      const response = await apiClient.put(`/admin/posts/${slug}`, post);
      // 清除相关缓存
      cacheManager.invalidate('posts');
      cacheManager.invalidate(`post-${slug}`);
      return response.data;
    } catch (error) {
      console.error('Admin updatePost API call failed:', error);
      throw new Error('更新文章失败，请检查网络连接或稍后重试');
    }
  },

  // 删除文章
  async deletePost(slug: string): Promise<void> {
    try {
      await apiClient.delete(`/admin/posts/${slug}`);
      // 清除相关缓存
      cacheManager.invalidate('posts');
      cacheManager.invalidate(`post-${slug}`);
    } catch (error) {
      console.error('Admin deletePost API call failed:', error);
      throw new Error('删除文章失败，请检查网络连接或稍后重试');
    }
  },

  // 登录验证
  login: async (token: string): Promise<boolean> => {
    try {
      // 使用GET方法，将token放在Authorization header中
      const response = await apiClient.get('/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success) {
        // 存储token到localStorage
        localStorage.setItem('admin-token', token);
        // 设置axios默认header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin login failed:', error);
      return false;
    }
  },

  // 检查是否已登录
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('admin-token');
    if (token) {
      // 设置axios默认header
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return true;
    }
    return false;
  },

  // 登出
  logout: (): void => {
    localStorage.removeItem('admin-token');
    delete apiClient.defaults.headers.common['Authorization'];
  },
};