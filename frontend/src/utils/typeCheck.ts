// Type check utility to ensure all types are properly exported
// This file can be removed after confirming types work correctly

import type {
  // Auth types
  LoginCredentials,
  LoginResponse,
  AdminUser,
  AuthState,
  AuthContextType,
  
  // Blog types
  Article,
  Category,
  BlogDataState,
  BlogDataActions,
  UseBlogDataReturn,
  
  // API types
  ApiResponse,
  DashboardStats,
  ApiError,
  PaginationParams,
  PaginatedResponse,
  UploadResponse,
} from '../types';

// Test type usage to ensure they're properly exported
export const typeTest = {
  // This function will only compile if all types are properly exported
  testTypes: (): void => {
    // Auth types
    const credentials: LoginCredentials = { username: '', password: '' };
    const response: LoginResponse = { success: true };
    const user: AdminUser = { id: '1', username: 'admin', role: 'admin' };
    const authState: AuthState = { isAuthenticated: false, user: null, token: null, isLoading: false, error: null };
    
    // Blog types
    const article: Article = {
      id: '1',
      title: 'Test',
      excerpt: 'Test excerpt',
      author: 'Test Author',
      publishDate: '2024-01-01',
      readTime: 5,
      category: 'Test',
      tags: ['test'],
    };
    
    const category: Category = {
      id: '1',
      name: 'Test Category',
      count: 0,
      icon: 'test',
    };
    
    // API types
    const apiResponse: ApiResponse<string> = { success: true, data: 'test' };
    const stats: DashboardStats = { totalPosts: 0, totalCategories: 0, totalViews: 0, recentPosts: 0 };
    
    // Prevent unused variable warnings
    console.log({ credentials, response, user, authState, article, category, apiResponse, stats });
  },
};

export default typeTest;
