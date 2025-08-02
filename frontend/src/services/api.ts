import axios from 'axios';
import type { BlogPost, BlogPostsResponse, Message, AdminDashboardData } from '../types/blog';
import { API_CONFIG } from '@/constants';

// API基础配置 - 使用统一的配置
const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('admin-token');
    if (token && config.url?.includes('/admin/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 添加响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 统一错误处理
    if (error.response?.status === 401) {
      localStorage.removeItem('admin-token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// 增强的缓存管理
class ApiCache {
  private cache = new Map<string, {
    data: unknown;
    timestamp: number;
    ttl: number;
    version: string;
    networkStatus: 'online' | 'offline';
  }>();
  private version = '1.0.0'; // 缓存版本
  private maxSize = 100; // 最大缓存条目数

  constructor() {
    // 监听网络状态变化
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkChange.bind(this));
      window.addEventListener('offline', this.handleNetworkChange.bind(this));
    }
  }

  private handleNetworkChange() {
    const isOnline = navigator.onLine;
    if (isOnline) {
      // 网络恢复时，标记所有缓存为可能过期
      this.markAllAsStale();
    }
  }

  private markAllAsStale() {
    for (const [key, item] of this.cache.entries()) {
      if (item.networkStatus === 'offline') {
        // 将离线缓存的TTL减半，促使更新
        this.cache.set(key, {
          ...item,
          ttl: item.ttl / 2,
          networkStatus: 'online'
        });
      }
    }
  }

  private evictOldest() {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  set(key: string, data: unknown, ttl: number = 300000) { // 默认5分钟TTL
    this.evictOldest();

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      version: this.version,
      networkStatus: navigator.onLine ? 'online' : 'offline'
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查版本兼容性
    if (item.version !== this.version) {
      this.cache.delete(key);
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 如果是离线缓存且现在在线，考虑刷新
    if (item.networkStatus === 'offline' && navigator.onLine) {
      // 返回缓存数据，但标记为需要刷新
      setTimeout(() => this.cache.delete(key), 0);
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

  // 获取缓存统计信息
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      version: this.version,
      entries: Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        age: Date.now() - item.timestamp,
        ttl: item.ttl,
        networkStatus: item.networkStatus
      }))
    };
  }

  // 更新缓存版本（用于强制失效所有缓存）
  updateVersion(newVersion: string) {
    this.version = newVersion;
    this.cache.clear();
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

  // AI内容生成
  async generateContent(
    prompt: string,
    type: string,
    deepseekApiKey?: string,
    deepseekModel?: string
  ): Promise<string> {
    try {
      const response = await apiClient.post('/admin/ai-assist', {
        prompt,
        type,
        deepseekApiKey,
        deepseekModel
      });
      return response.data.content;
    } catch (error) {
      console.error('Admin generateContent API call failed:', error);
      throw new Error('生成内容失败，请检查网络连接或稍后重试');
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

  // 上传图片
  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post('/admin/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.url || response.data.imageUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error('图片上传失败，请检查网络连接或稍后重试');
    }
  },
};