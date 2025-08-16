// API service for backend communication

import type { LoginCredentials, LoginResponse, Article, Category, Tag, ApiResponse, DashboardStats, UploadResponse, MusicTrack } from '../types';
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

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text}`);
      }

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
          token: 'admin123456', // This matches the BLOG_ADMIN_TOKEN in backend
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
  async getPosts(params?: { status?: string; search?: string; category?: string; page?: number; page_size?: number }): Promise<ApiResponse<Article[]>> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params?.status && params.status !== 'all') {
        // Map frontend status to backend status numbers
        const statusMap: { [key: string]: string } = {
          'published': '1',
          'draft': '0',
          'private': '3'
        };
        queryParams.append('status', statusMap[params.status] || '1');
      }

      const url = `/post/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.request<any>(url);

      if (response.success && response.data) {
        // Get categories to map category_id to category name
        const categoriesResponse = await this.getPublicCategories();
        const categoryMap = new Map<string, string>();

        if (categoriesResponse.success && categoriesResponse.data) {
          categoriesResponse.data.forEach((cat: Category) => {
            categoryMap.set(cat.id, cat.name);
          });
        }

        // Transform backend response to frontend format
        const backendData = response.data;
        const articles: Article[] = await Promise.all((backendData.data || []).map(async (post: any) => {
          // Get tags for this post
          let tags: string[] = [];
          try {
            const tagsResponse = await this.request<any>(`/post/${post.id}/tags`);
            if (tagsResponse.success && tagsResponse.data) {
              tags = (tagsResponse.data.data || []).map((tag: any) => tag.name);
            }
          } catch (error) {
            console.warn(`Failed to load tags for post ${post.id}:`, error);
          }

          return {
            id: post.id.toString(),
            title: post.title,
            content: post.content,
            excerpt: post.content.substring(0, 200) + '...',
            author: 'Cyrus',
            publishDate: post.created_at,
            readTime: Math.ceil(post.content.length / 1000),
            category: post.category_id ? (categoryMap.get(post.category_id.toString()) || 'Uncategorized') : 'Uncategorized',
            tags: tags,
            featured: false,
            status: post.status === 1 ? 'published' : post.status === 0 ? 'draft' : post.status === 3 ? 'private' : 'draft',
            imageUrl: post.cover_url,
            coverImage: post.cover_url
          };
        }));

        return { success: true, data: articles };
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
      };
    }
  }

  async getPost(id: string): Promise<ApiResponse<Article>> {
    try {
      const response = await this.request<any>(`/post/get/${id}`);

      if (response.success && response.data) {
        const post = response.data.data;
        if (post) {
          // Get categories to map category_id to category name
          const categoriesResponse = await this.getPublicCategories();
          const categoryMap = new Map<string, string>();

          if (categoriesResponse.success && categoriesResponse.data) {
            categoriesResponse.data.forEach((cat: Category) => {
              categoryMap.set(cat.id, cat.name);
            });
          }

          // Get tags for this post
          let tags: string[] = [];
          try {
            const tagsResponse = await this.request<any>(`/post/${post.id}/tags`);
            if (tagsResponse.success && tagsResponse.data) {
              tags = (tagsResponse.data.data || []).map((tag: any) => tag.name);
            }
          } catch (error) {
            console.warn(`Failed to load tags for post ${post.id}:`, error);
          }

          const article: Article = {
            id: post.id.toString(),
            title: post.title,
            content: post.content,
            excerpt: post.content.substring(0, 200) + '...',
            author: 'Cyrus',
            publishDate: post.created_at,
            readTime: Math.ceil(post.content.length / 1000),
            category: post.category_id ? (categoryMap.get(post.category_id.toString()) || 'Uncategorized') : 'Uncategorized',
            tags: tags,
            featured: false,
            status: post.status === 1 ? 'published' : post.status === 0 ? 'draft' : post.status === 3 ? 'private' : 'draft',
            imageUrl: post.cover_url,
            coverImage: post.cover_url
          };
          return { success: true, data: article };
        }
      }

      return { success: false, error: 'Post not found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch post',
      };
    }
  }

  async createPost(post: Partial<Article> & { status: 'draft' | 'published' }): Promise<ApiResponse<Article>> {
    try {
      // Map frontend status to backend PostStatus enum strings
      const statusMap: { [key: string]: string } = {
        'draft': 'Draft',
        'published': 'Published',
        'private': 'Private'
      };

      const requestData = {
        title: post.title || '',
        content: post.content || '',
        cover_url: post.coverImage || post.imageUrl || '',
        category_id: post.category ? parseInt(post.category) : null,
        status: statusMap[post.status || 'draft'] || 'Draft',
        post_images: (post as any).images || [] // Include images array from post data
      };

      const response = await this.request<any>('/post/create', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      if (response.success && response.data) {
        const backendPost = response.data.data;
        const article: Article = {
          id: backendPost.id.toString(),
          title: backendPost.title,
          content: backendPost.content,
          excerpt: post.excerpt || backendPost.content.substring(0, 200) + '...',
          author: 'Admin',
          publishDate: backendPost.created_at,
          readTime: Math.ceil(backendPost.content.length / 1000),
          category: backendPost.category_id ? `Category ${backendPost.category_id}` : 'Uncategorized',
          tags: post.tags || [],
          featured: post.featured || false,
          status: post.status || 'draft',
          imageUrl: backendPost.cover_url,
          coverImage: backendPost.cover_url
        };
        return { success: true, data: article };
      }

      return { success: false, error: response.error || 'Failed to create post' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post',
      };
    }
  }

  async updatePost(id: string, post: Partial<Article> & { status?: 'draft' | 'published' | 'private' }): Promise<ApiResponse<Article>> {
    try {
      // Map frontend status to backend PostStatus enum strings
      const statusMap: { [key: string]: string } = {
        'draft': 'Draft',
        'published': 'Published',
        'private': 'Private'
      };

      const requestData: any = {};

      if (post.title !== undefined) requestData.title = post.title;
      if (post.content !== undefined) requestData.content = post.content;
      if (post.coverImage !== undefined || post.imageUrl !== undefined) {
        requestData.cover_url = post.coverImage || post.imageUrl || '';
      }
      if (post.category !== undefined) {
        requestData.category_id = post.category ? parseInt(post.category) : null;
      }
      if (post.status !== undefined) {
        requestData.status = statusMap[post.status] || 'Draft';
      }
      if ((post as any).images !== undefined) {
        requestData.post_images = (post as any).images;
      }

      const response = await this.request<any>(`/post/update/${id}`, {
        method: 'PUT',
        body: JSON.stringify(requestData),
      });

      if (response.success && response.data) {
        const backendPost = response.data.data;
        const article: Article = {
          id: backendPost.id.toString(),
          title: backendPost.title,
          content: backendPost.content,
          excerpt: post.excerpt || backendPost.content.substring(0, 200) + '...',
          author: 'Admin',
          publishDate: backendPost.updated_at || backendPost.created_at,
          readTime: Math.ceil(backendPost.content.length / 1000),
          category: backendPost.category_id ? `Category ${backendPost.category_id}` : 'Uncategorized',
          tags: post.tags || [],
          featured: post.featured || false,
          status: post.status || 'draft',
          imageUrl: backendPost.cover_url,
          coverImage: backendPost.cover_url
        };
        return { success: true, data: article };
      }

      return { success: false, error: response.error || 'Failed to update post' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update post',
      };
    }
  }

  async deletePost(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.request<any>(`/post/delete/${id}`, {
        method: 'DELETE',
      });

      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Failed to delete post' };
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
    return this.getPublicCategories();
  }

  // Public Categories API
  async getPublicCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const response = await this.request<any>('/category/list');

      if (response.success && response.data) {
        const backendCategories = response.data.data || [];

        // Get all posts to calculate category counts
        const postsResponse = await this.request<any>('/post/list');
        const posts = postsResponse.success && postsResponse.data ? postsResponse.data.data || [] : [];

        // Create a map of category ID to category name
        const categoryIdToNameMap = new Map<number, string>();
        backendCategories.forEach((cat: any) => {
          categoryIdToNameMap.set(cat.id, cat.name);
        });

        const categoryCountMap = new Map<string, number>();
        posts.forEach((post: any) => {
          if (post.category_id) {
            const categoryName = categoryIdToNameMap.get(post.category_id);
            if (categoryName) {
              categoryCountMap.set(categoryName, (categoryCountMap.get(categoryName) || 0) + 1);
            }
          }
        });

        const categories: Category[] = [
          { id: 'all', name: 'All Articles', count: posts.length, icon: 'article' }
        ];

        backendCategories.forEach((cat: any) => {
          categories.push({
            id: cat.id.toString(),
            name: cat.name,
            count: categoryCountMap.get(cat.name) || 0,
            icon: this.getCategoryIcon(cat.name)
          });
        });

        return { success: true, data: categories };
      }

      return { success: false, error: 'Failed to fetch categories' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      };
    }
  }

  // Public Tags API
  async getPublicTags(): Promise<ApiResponse<Tag[]>> {
    try {
      const response = await this.request<any>('/tag/list');

      if (response.success && response.data) {
        const backendTags = response.data.data || [];

        // Get all posts to calculate tag counts (for now using mock data)
        const postsResponse = await this.getPosts();
        const posts = postsResponse.success ? postsResponse.data || [] : [];

        const tagCountMap = new Map<string, number>();
        posts.forEach((post: any) => {
          if (post.tags) {
            post.tags.forEach((tag: string) => {
              tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
            });
          }
        });

        const tags: Tag[] = backendTags.map((tag: any) => ({
          id: tag.id.toString(),
          name: tag.name,
          count: tagCountMap.get(tag.name) || 0
        }));

        // Sort tags by count (descending) then by name
        tags.sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.name.localeCompare(b.name);
        });

        return { success: true, data: tags };
      }

      return { success: false, error: 'Failed to fetch tags' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
      };
    }
  }

  // Get articles by category
  async getPostsByCategory(categoryId: string): Promise<ApiResponse<Article[]>> {
    try {
      if (categoryId === 'all') {
        return this.getPosts();
      }

      const postsResponse = await this.getPosts();
      if (!postsResponse.success || !postsResponse.data) {
        return postsResponse;
      }

      const filteredPosts = postsResponse.data.filter((post: Article) =>
        post.category.toLowerCase().replace(/\s+/g, '-') === categoryId
      );

      return { success: true, data: filteredPosts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts by category',
      };
    }
  }

  // Get articles by tag
  async getPostsByTag(tagName: string): Promise<ApiResponse<Article[]>> {
    try {
      const postsResponse = await this.getPosts();
      if (!postsResponse.success || !postsResponse.data) {
        return postsResponse;
      }

      const filteredPosts = postsResponse.data.filter((post: Article) =>
        post.tags.some((tag: string) => tag.toLowerCase().replace(/\s+/g, '-') === tagName)
      );

      return { success: true, data: filteredPosts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts by tag',
      };
    }
  }

  // Helper method to get category icon
  private getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      // Real categories from our backend
      '技术分享': 'share',
      'Web开发': 'web',
      'Rust编程': 'code',
      // Legacy categories for backward compatibility
      'Development': 'code',
      'Design': 'palette',
      'Technology': 'computer',
      'React': 'code',
      'Rust': 'code',
      'JavaScript': 'code',
      'TypeScript': 'code',
      'Web Development': 'web',
      'Mobile': 'phone_android',
      'AI': 'psychology',
      'Machine Learning': 'psychology',
      'Tutorial': 'school',
      'News': 'newspaper',
      'Review': 'rate_review'
    };

    return iconMap[categoryName] || 'article';
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
