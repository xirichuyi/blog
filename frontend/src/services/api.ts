// API service for backend communication

import type { LoginCredentials, LoginResponse, Article, Category, Tag, ApiResponse, DashboardStats, UploadResponse, MusicTrack } from '../types';
import { storageService } from './storage';
import { globalCache, CacheKeys } from '../utils/cacheManager';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006';
const API_PREFIX = '/api';

// Backend response typing helpers
interface BackendListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  page_size?: number;
}

interface BackendPost {
  id: number;
  title: string;
  content: string;
  created_at: string;
  status: number;
  category_id?: number;
  cover_url?: string;
}

interface BackendTag { id: number; name: string }
// interface BackendCategory { id: number; name: string } // used in getPublicCategories

type PostImagesPayload = { post_images?: string[] };

class ApiService {
  private baseURL: string;
  constructor() {
    this.baseURL = `${API_BASE_URL}${API_PREFIX}`;

    // Clean expired cache entries periodically
    setInterval(() => {
      globalCache.cleanExpired();
    }, 60000); // Every minute
  }

  // Enhanced cache methods using global cache manager
  private getCachedData<T>(key: string): T | null {
    return globalCache.get<T>(key);
  }



  private invalidateCache(pattern: RegExp): void {
    globalCache.invalidatePattern(pattern);
  }

  // 清理缓存方法
  public clearCache(): void {
    globalCache.clear();
  }

  // 公共方法设置缓存，供DataContext使用
  public setCachedData<T>(key: string, data: T, ttl?: number): void {
    globalCache.set(key, data, ttl);
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
    try {
      const response = await fetch(`${this.baseURL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return { success: true, data };
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
      if (params?.category) {
        queryParams.append('category_id', params.category);
      }

      const url = `/post/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.request<BackendListResponse<BackendPost>>(url);

      if (response.success && response.data) {
        // 使用缓存获取categories，避免重复请求
        const cacheKey = CacheKeys.categories();
        const categoryMap: Map<string, string> = this.getCachedData<Map<string, string>>(cacheKey) ?? new Map<string, string>();

        // 完全避免在getPosts中调用getPublicCategories，防止循环调用
        // 分类数据应该由DataContext统一管理
        if (categoryMap.size === 0) {
          // 先尝试从全局缓存获取
          const cachedCategories = this.getCachedData<Category[]>('public_categories');
          if (cachedCategories && cachedCategories.length > 0) {
            cachedCategories.forEach((cat: Category) => {
              categoryMap.set(cat.id, cat.name);
            });
            this.setCachedData(cacheKey, categoryMap);
          }
          // 如果缓存中没有分类数据，使用默认值，不再发起请求
        }

        // Transform backend response to frontend format
        const backendData: BackendListResponse<BackendPost> = response.data as BackendListResponse<BackendPost>;
        const postIds = (backendData.data || []).map((post) => post.id.toString());

        // 批量获取所有文章的tags，避免N+1查询
        const tagsMap = await this.getBatchPostTags(postIds);

        const articles: Article[] = (backendData.data || []).map((post) => {
          const tags = tagsMap.get(post.id.toString()) || [];

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
            imageUrl: post.cover_url ? `${API_BASE_URL}${post.cover_url}` : undefined,
            coverImage: post.cover_url ? `${API_BASE_URL}${post.cover_url}` : undefined
          };
        });

        return {
          success: true,
          data: articles,
          total: backendData.total || articles.length,
          page: backendData.page || 1,
          page_size: backendData.page_size || articles.length
        };
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
      };
    }
  }

  // 批量获取文章tags的辅助方法
  private async getBatchPostTags(postIds: string[]): Promise<Map<string, string[]>> {
    const tagsMap = new Map<string, string[]>();

    // 检查缓存
    const cachedTags = new Map<string, string[]>();
    const uncachedIds: string[] = [];

    postIds.forEach(id => {
      const cacheKey = `post_tags_${id}`;
      const cached = this.getCachedData<string[]>(cacheKey);
      if (cached) {
        cachedTags.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    });

    // 对于未缓存的，批量请求（这里暂时还是单独请求，但可以优化为真正的批量API）
    const tagPromises = uncachedIds.map(async (id) => {
      try {
        const tagsResponse = await this.request<BackendListResponse<BackendTag>>(`/post/${id}/tags`);
        if (tagsResponse.success && tagsResponse.data) {
          const tags = (tagsResponse.data.data || []).map((tag: BackendTag) => tag.name);
          this.setCachedData(`post_tags_${id}`, tags);
          return { id, tags };
        }
      } catch (error) {
        console.warn(`Failed to load tags for post ${id}:`, error);
      }
      return { id, tags: [] };
    });

    const tagResults = await Promise.all(tagPromises);

    // 合并缓存和新获取的数据
    cachedTags.forEach((tags, id) => tagsMap.set(id, tags));
    tagResults.forEach(({ id, tags }) => tagsMap.set(id, tags));

    return tagsMap;
  }

  async getPost(id: string): Promise<ApiResponse<Article>> {
    try {
      const response = await this.request<{ data: BackendPost }>(`/post/get/${id}`);

      if (response.success && response.data) {
        const post = response.data.data;
        if (post) {
          // Use cached categories map - avoid calling getPublicCategories to prevent duplicate requests
          const cacheKey = 'categories';
          const categoryMap: Map<string, string> = this.getCachedData<Map<string, string>>(cacheKey) ?? new Map<string, string>();
          if (categoryMap.size === 0) {
            // 先尝试从全局缓存获取
            const cachedCategories = this.getCachedData<Category[]>('public_categories');
            if (cachedCategories && cachedCategories.length > 0) {
              cachedCategories.forEach((cat: Category) => {
                categoryMap.set(cat.id, cat.name);
              });
              this.setCachedData(cacheKey, categoryMap);
            }
            // 如果缓存中没有分类数据，使用默认值，不再发起请求
          }

          // Get tags with cache helper
          const tagsMap = await this.getBatchPostTags([post.id.toString()]);
          const tags = tagsMap.get(post.id.toString()) || [];

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
            imageUrl: post.cover_url ? `${API_BASE_URL}${post.cover_url}` : undefined,
            coverImage: post.cover_url ? `${API_BASE_URL}${post.cover_url}` : undefined
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
        post_images: (post as Partial<Article> & { images?: string[] }).images || []
      };

      const response = await this.request<{ data: BackendPost }>('/post/create', {
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
          imageUrl: backendPost.cover_url ? `${API_BASE_URL}${backendPost.cover_url}` : undefined,
          coverImage: backendPost.cover_url ? `${API_BASE_URL}${backendPost.cover_url}` : undefined
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

      const requestData: Partial<{ title: string; content: string; cover_url: string; category_id: number | null; status: string } & PostImagesPayload> = {};

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
      const maybeImages = (post as Partial<Article> & { images?: string[] }).images;
      if (maybeImages !== undefined) {
        requestData.post_images = maybeImages;
      }

      const response = await this.request<{ data: BackendPost }>(`/post/update/${id}`, {
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
          imageUrl: backendPost.cover_url ? `${API_BASE_URL}${backendPost.cover_url}` : undefined,
          coverImage: backendPost.cover_url ? `${API_BASE_URL}${backendPost.cover_url}` : undefined
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
      const response = await this.request<object>(`/post/delete/${id}`, {
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
    return this.request<Article>(`/admin/posts/${id}/publish`, {
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

  // Public Categories API - 轻量实现（不再额外请求所有文章来统计数量，避免循环和巨大开销）
  async getPublicCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const response = await this.request<BackendListResponse<{ id: number; name: string }>>('/category/list');

      if (response.success && response.data) {
        const backendCategories: Array<{ id: number; name: string }> = response.data.data || [];

        const categories: Category[] = [
          { id: 'all', name: 'All Articles', count: 0, icon: 'article' }
        ];

        backendCategories.forEach((cat) => {
          categories.push({
            id: cat.id.toString(),
            name: cat.name,
            count: 0,
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
      const response = await this.request<BackendListResponse<BackendTag>>('/tag/list');

      if (response.success && response.data) {
        const backendTags = response.data.data || [];

        // 使用缓存获取标签数量，避免重复API调用
        const cacheKey = 'tag_counts';
        let tagCountMap = this.getCachedData<Map<string, number>>(cacheKey);

        if (!tagCountMap) {
          // 暂时不计算标签数量，避免循环调用
          // 标签数量将在DataContext中统一计算
          tagCountMap = new Map<string, number>();

          // 缓存空的标签数量映射，避免重复检查
          this.setCachedData(cacheKey, tagCountMap);
        }

        // 确保tagCountMap不为null
        if (!tagCountMap) {
          tagCountMap = new Map<string, number>();
        }

        const tags: Tag[] = backendTags.map((tag: BackendTag) => ({
          id: tag.id.toString(),
          name: tag.name,
          count: tagCountMap?.get(tag.name) || 0
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
        return this.getPosts({ page_size: 1000 });
      }

      // Use the backend's category filtering by passing category_id as a number
      const categoryIdNum = parseInt(categoryId);
      if (isNaN(categoryIdNum)) {
        return {
          success: false,
          error: 'Invalid category ID',
        };
      }

      return this.getPosts({
        category: categoryId,
        page_size: 1000
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts by category',
      };
    }
  }

  // Get articles by tag
  async getPostsByTag(tagId: string): Promise<ApiResponse<Article[]>> {
    try {
      // 使用缓存获取标签数据，避免重复请求
      const cachedTags = this.getCachedData<Tag[]>('public_tags');
      let targetTag: Tag | undefined;

      if (cachedTags && cachedTags.length > 0) {
        targetTag = cachedTags.find((tag: Tag) => tag.id === tagId);
      } else {
        // 如果缓存中没有标签数据，直接使用标签ID作为名称
        // 这是一个临时解决方案，避免循环调用
        targetTag = { id: tagId, name: tagId, count: 0 };
      }

      if (!targetTag) {
        return {
          success: false,
          error: 'Tag not found',
        };
      }

      // Since backend doesn't support tag filtering in getPosts,
      // we need to get all posts and filter by tag name on frontend
      const postsResponse = await this.getPosts({ page_size: 1000 });
      if (!postsResponse.success || !postsResponse.data) {
        return postsResponse;
      }

      // Filter posts that have the specified tag name
      const filteredPosts = postsResponse.data.filter((post: Article) =>
        post.tags.some((tagName: string) => tagName === targetTag!.name)
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
    const iconMap: Record<string, string> = {
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
      const authToken = localStorage.getItem('admin_token');
      if (!authToken) {
        // Assuming showNotification is available globally or imported
        // If not, you might need to import it or handle it differently
        // For now, we'll just return an error response
        return {
          success: false,
          error: 'Authentication token not found. Please log in to upload files.',
        };
      }

      const response = await fetch(`${this.baseURL}/admin/upload`, {
        method: 'POST',
        headers: {
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
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

  // Category Management APIs
  async createCategory(categoryData: { name: string; description?: string; icon?: string }): Promise<ApiResponse<Category>> {
    return this.request('/category/create', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(categoryId: string, categoryData: { name?: string; description?: string; icon?: string }): Promise<ApiResponse<Category>> {
    return this.request(`/category/update/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(categoryId: string): Promise<ApiResponse<void>> {
    return this.request(`/category/delete/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // Tag Management APIs
  async createTag(tagData: { name: string }): Promise<ApiResponse<Tag>> {
    return this.request('/tag/create', {
      method: 'POST',
      body: JSON.stringify(tagData),
    });
  }

  async updateTag(tagId: string, tagData: { name?: string }): Promise<ApiResponse<Tag>> {
    return this.request(`/tag/update/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify(tagData),
    });
  }

  async deleteTag(tagId: string): Promise<ApiResponse<void>> {
    return this.request(`/tag/delete/${tagId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
