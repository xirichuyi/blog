// 博客文章类型定义
export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  categories: string[];
  content?: string;
  featuredImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

// API响应类型
export interface BlogPostsResponse {
  posts: BlogPost[];
  totalPosts: number;
  totalPages: number;
}

// 聊天消息类型
export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

// 主题类型
export type Theme = 'light' | 'dark' | 'system';

// 管理员相关类型
export interface AdminDashboardData {
  posts: BlogPost[];
  categories: string[];
  recentPosts: BlogPost[];
  totalPosts: number;
  totalCategories: number;
  latestPost: BlogPost | null;
}

// API错误类型
export interface ApiError {
  error: string;
  status?: number;
}

// 搜索参数类型
export interface SearchParams {
  page?: string;
  q?: string;
  category?: string;
}
