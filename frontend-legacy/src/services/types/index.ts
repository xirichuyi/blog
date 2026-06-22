// Type definitions index file - Re-export all types

// Authentication types
export type {
  LoginCredentials,
  LoginResponse,
  AdminUser,
  AuthState,
  AuthContextType,
} from './auth';

// Blog types
export type {
  Article,
  Category,
  Tag,
  BlogDataState,
  BlogDataActions,
  UseBlogDataReturn,
} from './blog';

// API types
export type {
  ApiResponse,
  DashboardStats,
  ApiError,
  PaginationParams,
  PaginatedResponse,
  UploadResponse,
  MusicTrack,
  MusicUploadData,
} from './api';

// Add missing PaginationInfo type
export interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
}
