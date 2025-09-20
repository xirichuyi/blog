// Posts API service

import { BaseApiService } from './base';
import type { Article, ApiResponse } from '../types';

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
    updated_at?: string;
    status: number;
    category_id?: number;
    cover_url?: string;
}

interface BackendTag {
    id: number;
    name: string;
}

type PostImagesPayload = { post_images?: string[] };

export class PostsApiService extends BaseApiService {
    // Blog Management APIs
    async getPosts(params?: { status?: string; search?: string; category?: string; tag_id?: number; page?: number; page_size?: number }): Promise<ApiResponse<Article[]>> {
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
            if (params?.search) {
                queryParams.append('search', params.search);
            }
            if (params?.tag_id) {
                queryParams.append('tag_id', params.tag_id.toString());
            }

            // Use the optimized endpoint that includes tags and category names
            const url = `/post/list_with_details${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

            interface BackendPostWithDetails {
                post: BackendPost;
                tags: Array<{ id: number; name: string; created_at: string; updated_at: string }>;
                category_name?: string;
            }

            const response = await this.request<BackendListResponse<BackendPostWithDetails>>(url);

            if (response.success && response.data) {
                // Transform backend response to frontend format - no need for additional API calls!
                const backendData: BackendListResponse<BackendPostWithDetails> = response.data as BackendListResponse<BackendPostWithDetails>;

                const articles: Article[] = (backendData.data || []).map((postWithDetails) => {
                    const post = postWithDetails.post;
                    const tags = postWithDetails.tags.map(tag => tag.name);
                    const category = postWithDetails.category_name || 'Uncategorized';

                    return {
                        id: post.id.toString(),
                        title: post.title,
                        content: post.content,
                        excerpt: this.generatePlainTextExcerpt(post.content, 80),
                        author: 'chuyi',
                        publishDate: post.created_at,
                        readTime: Math.ceil(post.content.length / 1000),
                        category: category,
                        tags: tags,
                        featured: false,
                        status: post.status === 1 ? 'published' : post.status === 0 ? 'draft' : post.status === 3 ? 'private' : 'draft',
                        imageUrl: post.cover_url ? this.getImageUrl(post.cover_url) : undefined,
                        coverImage: post.cover_url ? this.getImageUrl(post.cover_url) : undefined
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

            return {
                success: false,
                error: 'Failed to fetch posts with details',
            };
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
                        const cachedCategories = this.getCachedData<Array<{ id: string, name: string }>>('public_categories');
                        if (cachedCategories && cachedCategories.length > 0) {
                            cachedCategories.forEach((cat: { id: string, name: string }) => {
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
                        excerpt: this.generatePlainTextExcerpt(post.content, 80),
                        author: 'chuyi',
                        publishDate: post.created_at,
                        readTime: Math.ceil(post.content.length / 1000),
                        category: post.category_id ? (categoryMap.get(post.category_id.toString()) || 'Uncategorized') : 'Uncategorized',
                        tags: tags,
                        featured: false,
                        status: post.status === 1 ? 'published' : post.status === 0 ? 'draft' : post.status === 3 ? 'private' : 'draft',
                        imageUrl: post.cover_url ? this.getImageUrl(post.cover_url) : undefined,
                        coverImage: post.cover_url ? this.getImageUrl(post.cover_url) : undefined
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

            // Create post first
            const response = await this.request<{ data: BackendPost }>('/post/create', {
                method: 'POST',
                body: JSON.stringify(requestData),
            });

            if (!response.success || !response.data) {
                return { success: false, error: response.error || 'Failed to create post' };
            }

            const backendPost = response.data.data;
            const postId = backendPost.id.toString();

            // Add tags if provided
            if (post.tags && post.tags.length > 0) {
                const tagIds = await this.getOrCreateTagIds(post.tags);
                if (tagIds.length > 0) {
                    await this.updatePostTags(postId, tagIds);
                }
            }

            const article: Article = {
                id: postId,
                title: backendPost.title,
                content: backendPost.content,
                excerpt: post.excerpt || this.generatePlainTextExcerpt(backendPost.content, 80),
                author: 'Admin',
                publishDate: backendPost.created_at,
                readTime: Math.ceil(backendPost.content.length / 1000),
                category: backendPost.category_id ? `Category ${backendPost.category_id}` : 'Uncategorized',
                tags: post.tags || [],
                featured: post.featured || false,
                status: post.status || 'draft',
                imageUrl: backendPost.cover_url ? this.getImageUrl(backendPost.cover_url) : undefined,
                coverImage: backendPost.cover_url ? this.getImageUrl(backendPost.cover_url) : undefined
            };
            return { success: true, data: article };
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

            // Update post basic info
            const response = await this.request<{ data: BackendPost }>(`/post/update/${id}`, {
                method: 'PUT',
                body: JSON.stringify(requestData),
            });

            if (!response.success || !response.data) {
                return { success: false, error: response.error || 'Failed to update post' };
            }

            // Update tags if provided
            if (post.tags !== undefined) {
                const tagIds = await this.getOrCreateTagIds(post.tags);
                if (tagIds.length > 0 || post.tags.length === 0) {
                    await this.updatePostTags(id, tagIds);
                }
            }

            const backendPost = response.data.data;
            const article: Article = {
                id: backendPost.id.toString(),
                title: backendPost.title,
                content: backendPost.content,
                excerpt: post.excerpt || this.generatePlainTextExcerpt(backendPost.content, 80),
                author: 'Admin',
                publishDate: backendPost.updated_at || backendPost.created_at,
                readTime: Math.ceil(backendPost.content.length / 1000),
                category: backendPost.category_id ? `Category ${backendPost.category_id}` : 'Uncategorized',
                tags: post.tags || [],
                featured: post.featured || false,
                status: post.status || 'draft',
                imageUrl: backendPost.cover_url ? this.getImageUrl(backendPost.cover_url) : undefined,
                coverImage: backendPost.cover_url ? this.getImageUrl(backendPost.cover_url) : undefined
            };
            return { success: true, data: article };
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

    async publishPost(id: string): Promise<ApiResponse<Article>> {
        // Use the update post API to change status to published
        return this.updatePost(id, { status: 'published' });
    }

    async unpublishPost(id: string): Promise<ApiResponse<Article>> {
        // Use the update post API to change status to draft
        return this.updatePost(id, { status: 'draft' });
    }

    // Post Tags Management APIs
    async updatePostTags(postId: string, tagIds: number[]): Promise<ApiResponse<BackendTag[]>> {
        return this.request(`/post/update_tags/${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ tag_ids: tagIds }),
        });
    }

    async getPostTags(postId: string): Promise<ApiResponse<BackendTag[]>> {
        return this.request(`/post/get_tags/${postId}`);
    }

    // Helper method to convert tag names to tag IDs
    private async getOrCreateTagIds(tagNames: string[]): Promise<number[]> {
        if (tagNames.length === 0) return [];

        try {
            // Get all existing tags - this will need to be imported from tags service
            // For now, we'll make a direct request
            const tagsResponse = await this.request<{ data: BackendTag[] }>('/tag/list');
            if (!tagsResponse.success || !tagsResponse.data) {
                return [];
            }

            const existingTags = tagsResponse.data.data || [];
            const tagIds: number[] = [];

            for (const tagName of tagNames) {
                // Find existing tag
                const existingTag = existingTags.find((tag: BackendTag) => tag.name === tagName);

                if (existingTag) {
                    tagIds.push(existingTag.id);
                } else {
                    // Create new tag
                    const createResponse = await this.request<{ data: BackendTag }>('/tag/create', {
                        method: 'POST',
                        body: JSON.stringify({ name: tagName }),
                    });
                    if (createResponse.success && createResponse.data) {
                        tagIds.push(createResponse.data.data.id);
                    }
                }
            }

            return tagIds;
        } catch (error) {
            console.error('Failed to get or create tag IDs:', error);
            return [];
        }
    }
}
