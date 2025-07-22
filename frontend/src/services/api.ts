import axios from 'axios';
import type { BlogPost, BlogPostsResponse, Message, AdminDashboardData } from '../types/blog';
import { mockApi, shouldUseMockData } from './mockData';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    if (error.response?.status === 401) {
      // 清除无效token
      localStorage.removeItem('blogAdminToken');
      // 可以在这里添加重定向到登录页面的逻辑
    }
    return Promise.reject(error);
  }
);

// 博客相关API
export const blogApi = {
  // 获取所有文章（带分页）
  async getPosts(page: number = 1, limit: number = 6): Promise<BlogPostsResponse> {
    if (shouldUseMockData()) {
      return mockApi.getPosts(page, limit);
    }
    try {
      const response = await apiClient.get(`/posts?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return mockApi.getPosts(page, limit);
    }
  },

  // 根据slug获取单篇文章
  async getPostBySlug(slug: string): Promise<BlogPost> {
    if (shouldUseMockData()) {
      const post = await mockApi.getPostBySlug(slug);
      if (!post) throw new Error('Post not found');
      return post;
    }
    try {
      const response = await apiClient.get(`/posts/${slug}`);
      return response.data;
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
    if (shouldUseMockData()) {
      return mockApi.getCategories();
    }
    try {
      const response = await apiClient.get('/categories');
      return response.data;
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
    const response = await apiClient.get('/admin/posts');
    return response.data;
  },

  // 创建新文章
  async createPost(postData: Omit<BlogPost, 'id'> & { content: string }): Promise<{ success: boolean; message?: string; post?: BlogPost }> {
    const response = await apiClient.post('/admin/posts', postData);
    return response.data;
  },

  // 更新文章
  async updatePost(slug: string, postData: Partial<BlogPost> & { content?: string }): Promise<{ success: boolean; message?: string; post?: BlogPost }> {
    const response = await apiClient.put(`/admin/posts/${slug}`, postData);
    return response.data;
  },

  // 删除文章
  async deletePost(slug: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/admin/posts/${slug}`);
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
    } catch (error) {
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
};

export default apiClient;
