// API service for backend communication

import type { LoginCredentials, LoginResponse, Article, Category, ApiResponse, DashboardStats, UploadResponse, MusicTrack } from '../types';
import { storageService } from './storage';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006';
const API_PREFIX = '/api';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}${API_PREFIX}`;
  }

  // Helper method to get auth headers
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders(),
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Authentication APIs
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    // For now, simulate login with admin token
    // In real implementation, this would call /api/admin/login
    try {
      if (credentials.username === 'admin' && credentials.password === 'admin123456') {
        const response: LoginResponse = {
          success: true,
          token: 'admin123456',
          user: {
            id: '1',
            username: 'admin',
            email: 'admin@cyrusblog.com',
            role: 'admin',
            lastLogin: new Date().toISOString(),
          },
        };
        return { success: true, data: response };
      } else {
        return {
          success: false,
          error: 'Invalid username or password',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async verifyToken(): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request('/admin/verify');
  }

  // Dashboard APIs
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request('/admin/dashboard');
  }

  // Blog Management APIs
  async getPosts(params?: { status?: string; search?: string; category?: string }): Promise<ApiResponse<Article[]>> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      let posts = storageService.getPosts();

      // Apply filters
      if (params?.status && params.status !== 'all') {
        posts = posts.filter(post => post.status === params.status);
      }

      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        posts = posts.filter(post =>
          post.title.toLowerCase().includes(searchLower) ||
          post.excerpt.toLowerCase().includes(searchLower) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      if (params?.category) {
        posts = posts.filter(post => post.category === params.category);
      }

      return { success: true, data: posts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
      };
    }
  }

  async getPost(id: string): Promise<ApiResponse<Article>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const post = storageService.getPost(id);
      if (post) {
        return { success: true, data: post };
      } else {
        return { success: false, error: 'Post not found' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch post',
      };
    }
  }

  async createPost(post: Partial<Article> & { status: 'draft' | 'published' }): Promise<ApiResponse<Article>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const newPost: Article = {
        id: storageService.generateId(),
        title: post.title || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        author: post.author || 'Admin',
        publishDate: post.publishDate || new Date().toISOString(),
        readTime: post.readTime || 1,
        category: post.category || '',
        tags: post.tags || [],
        featured: post.featured || false,
        status: post.status || 'draft',
      };

      const savedPost = storageService.savePost(newPost);
      return { success: true, data: savedPost };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post',
      };
    }
  }

  async updatePost(id: string, post: Partial<Article> & { status?: 'draft' | 'published' }): Promise<ApiResponse<Article>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const existingPost = storageService.getPost(id);
      if (!existingPost) {
        return { success: false, error: 'Post not found' };
      }

      const updatedPost: Article = {
        ...existingPost,
        ...post,
        id, // Ensure ID doesn't change
      };

      const savedPost = storageService.savePost(updatedPost);
      return { success: true, data: savedPost };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update post',
      };
    }
  }

  async deletePost(id: string): Promise<ApiResponse<void>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const success = storageService.deletePost(id);
      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'Post not found' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete post',
      };
    }
  }

  async bulkDeletePosts(ids: string[]): Promise<ApiResponse<void>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      const success = storageService.deletePosts(ids);
      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'Some posts could not be deleted' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete posts',
      };
    }
  }

  async publishPost(id: string): Promise<ApiResponse<Article>> {
    return this.request(`/admin/posts/${id}/publish`, {
      method: 'POST',
    });
  }

  async unpublishPost(id: string): Promise<ApiResponse<Article>> {
    return this.request(`/admin/posts/${id}/unpublish`, {
      method: 'POST',
    });
  }

  // Category Management APIs
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request('/admin/categories');
  }

  // Music Management APIs
  async getMusicTracks(params?: { search?: string; genre?: string }): Promise<ApiResponse<MusicTrack[]>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      let tracks = storageService.getMusicTracks();

      // Apply filters
      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        tracks = tracks.filter(track =>
          track.title.toLowerCase().includes(searchLower) ||
          track.artist.toLowerCase().includes(searchLower) ||
          track.album?.toLowerCase().includes(searchLower)
        );
      }

      if (params?.genre) {
        tracks = tracks.filter(track => track.genre === params.genre);
      }

      return { success: true, data: tracks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch music tracks',
      };
    }
  }

  async uploadMusic(formData: FormData): Promise<ApiResponse<MusicTrack>> {
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract form data
      const title = formData.get('title') as string;
      const artist = formData.get('artist') as string;
      const album = formData.get('album') as string;
      const genre = formData.get('genre') as string;
      const musicFile = formData.get('music') as File;
      const coverFile = formData.get('cover') as File;

      // Create new music track
      const newTrack: MusicTrack = {
        id: storageService.generateId(),
        title: title || 'Untitled',
        artist: artist || 'Unknown Artist',
        album: album || undefined,
        genre: genre || undefined,
        duration: Math.floor(Math.random() * 300) + 60, // Random duration 1-6 minutes
        fileUrl: `/music/${musicFile.name}`, // Simulated URL
        coverUrl: coverFile ? `/covers/${coverFile.name}` : undefined,
        uploadDate: new Date().toISOString(),
        fileSize: musicFile.size / (1024 * 1024), // Convert to MB
        status: 'active',
      };

      const savedTrack = storageService.saveMusicTrack(newTrack);
      return { success: true, data: savedTrack };
    } catch (error) {
      console.error('Music upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async deleteMusic(id: string): Promise<ApiResponse<void>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const success = storageService.deleteMusicTrack(id);
      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'Music track not found' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete music track',
      };
    }
  }

  async bulkDeleteMusic(ids: string[]): Promise<ApiResponse<void>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      const success = storageService.deleteMusicTracks(ids);
      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'Some music tracks could not be deleted' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete music tracks',
      };
    }
  }

  // File Upload APIs
  async uploadFile(file: File, type: 'image' | 'audio' | 'document'): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${this.baseURL}/admin/upload`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
