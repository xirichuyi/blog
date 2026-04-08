// Posts API service

import { BaseApiService } from './base';
import type { Article, ApiResponse } from '../types';
import { generateCacheKey } from '../../utils/cacheManager';
import { logger } from '../../utils/logger';
import { siteConfig } from '../../config/site';

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
    category_name?: string;
    cover_url?: string;
    tags?: Array<{
        id: number;
        name: string;
        created_at: string;
        updated_at: string;
    }>;
}

interface BackendTag {
    id: number;
    name: string;
}

type PostImagesPayload = { post_images?: string[] };

// 缓存有效期：3分钟（文章列表可能更新较频繁）
const ARTICLES_LIST_CACHE_TTL = 3 * 60 * 1000;
// 单篇文章缓存：5分钟
const ARTICLE_DETAIL_CACHE_TTL = 5 * 60 * 1000;

export class PostsApiService extends BaseApiService {
    // Blog Management APIs - 带缓存
    async getPosts(params?: { status?: string; search?: string; category?: string; tag_id?: number; page?: number; page_size?: number }, forceRefresh = false): Promise<ApiResponse<Article[]>> {
        // 生成缓存key（基于请求参数）
        const cacheKey = generateCacheKey('articles_list', params);

        // 检查缓存（除非强制刷新或有搜索条件）
        // 搜索结果不缓存，因为用户可能频繁修改搜索词
        if (!forceRefresh && !params?.search) {
            const cached = this.getCachedData<{
                articles: Article[];
                total: number;
                page: number;
                page_size: number;
            }>(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: cached.articles,
                    total: cached.total,
                    page: cached.page,
                    page_size: cached.page_size
                };
            }
        }

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

            // 后端返回的是 ApiListResponse 格式: { code, message, data, total, page, page_size }
            const response = await this.request<{
                code: number;
                message: string;
                data?: BackendPostWithDetails[];
                total?: number;
                page?: number;
                page_size?: number;
            }>(url);

            if (response.success && response.data) {
                // 后端返回格式: { code, message, data: [...], total, page, page_size }
                const backendResponse = response.data;
                
                if (!backendResponse.data) {
                    return {
                        success: false,
                        error: 'No data in response',
                    };
                }

                const articles: Article[] = backendResponse.data.map((postWithDetails) => {
                    const post = postWithDetails.post;
                    const tags = postWithDetails.tags.map(tag => tag.name);
                    const category = postWithDetails.category_name || 'Uncategorized';

                    // 后端列表接口返回的是摘要（content字段已截取），直接使用作为excerpt
                    // 详情接口会返回完整内容
                    return {
                        id: post.id.toString(),
                        title: post.title,
                        content: post.content, // 列表接口返回的是摘要
                        excerpt: post.content, // 直接使用摘要作为excerpt
                        author: siteConfig.author.name,
                        publishDate: post.created_at,
                        readTime: Math.ceil(post.content.length / 1000), // 基于摘要计算，实际阅读时间需要从详情获取
                        category: category,
                        categoryId: post.category_id ? post.category_id.toString() : undefined,
                        tags: tags,
                        featured: false,
                        status: post.status === 1 ? 'published' : post.status === 0 ? 'draft' : post.status === 3 ? 'private' : 'draft',
                        imageUrl: post.cover_url ? this.getImageUrl(post.cover_url) : undefined,
                        coverImage: post.cover_url ? this.getImageUrl(post.cover_url) : undefined
                    };
                });

                const result = {
                    articles,
                    total: backendResponse.total || articles.length,
                    page: backendResponse.page || 1,
                    page_size: backendResponse.page_size || articles.length
                };

                // 存入缓存（搜索结果不缓存）
                if (!params?.search) {
                    this.setCachedData(cacheKey, result, ARTICLES_LIST_CACHE_TTL);
                }

                return {
                    success: true,
                    data: result.articles,
                    total: result.total,
                    page: result.page,
                    page_size: result.page_size
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
                logger.warn(`Failed to load tags for post ${id}:`, error);
            }
            return { id, tags: [] };
        });

        const tagResults = await Promise.all(tagPromises);

        // 合并缓存和新获取的数据
        cachedTags.forEach((tags, id) => tagsMap.set(id, tags));
        tagResults.forEach(({ id, tags }) => tagsMap.set(id, tags));

        return tagsMap;
    }

    async getPost(id: string, forceRefresh = false): Promise<ApiResponse<Article>> {
        const cacheKey = `article_detail_${id}`;

        // 检查缓存（除非强制刷新）
        if (!forceRefresh) {
            const cached = this.getCachedData<Article>(cacheKey);
            if (cached) {
                return { success: true, data: cached };
            }
        }

        try {
            // 后端 /api/post/get/:id 返回格式: { code, message, data: { ... } }
            const response = await this.request<{
                code: number;
                message: string;
                data: BackendPost;
            }>(`/post/get/${id}`);

            if (response.success && response.data && response.data.data) {
                const post = response.data.data;
                
                // 优先使用后端返回的 category_name，如果没有则尝试从缓存映射获取
                let categoryName = post.category_name || 'Uncategorized';
                
                if (!post.category_name && post.category_id) {
                    const categoryCacheKey = 'categories';
                    const categoryMap = this.getCachedData<Map<string, string>>(categoryCacheKey);
                    if (categoryMap) {
                        categoryName = categoryMap.get(post.category_id.toString()) || 'Uncategorized';
                    }
                }

                // 优先使用后端返回的 tags，如果没有则尝试从缓存/批量接口获取
                let tags: string[] = [];
                if (post.tags && Array.isArray(post.tags)) {
                    tags = post.tags.map(tag => tag.name);
                } else {
                    try {
                        const tagsMap = await this.getBatchPostTags([post.id.toString()]);
                        tags = tagsMap.get(post.id.toString()) || [];
                    } catch (e) {
                        logger.warn('Failed to fetch tags for article detail:', e);
                    }
                }

                const article: Article = {
                    id: post.id.toString(),
                    title: post.title,
                    content: post.content,
                    excerpt: this.generatePlainTextExcerpt(post.content, 80),
                    author: siteConfig.author.name,
                    publishDate: post.created_at,
                    readTime: Math.ceil((post.content?.length || 0) / 1000) || 1,
                    category: categoryName,
                    categoryId: post.category_id ? post.category_id.toString() : undefined,
                    tags: tags,
                    featured: false,
                    status: post.status === 1 ? 'published' : post.status === 0 ? 'draft' : post.status === 3 ? 'private' : 'draft',
                    imageUrl: post.cover_url ? this.getImageUrl(post.cover_url) : undefined,
                    coverImage: post.cover_url ? this.getImageUrl(post.cover_url) : undefined
                };

                // 存入缓存
                this.setCachedData(cacheKey, article, ARTICLE_DETAIL_CACHE_TTL);

                return { success: true, data: article };
            }

            return { success: false, error: response.data?.message || 'Post not found' };
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
                author: siteConfig.author.name,
                publishDate: backendPost.created_at,
                readTime: Math.ceil(backendPost.content.length / 1000),
                category: backendPost.category_id ? `Category ${backendPost.category_id}` : 'Uncategorized',
                categoryId: backendPost.category_id ? backendPost.category_id.toString() : undefined,
                tags: post.tags || [],
                featured: post.featured || false,
                status: post.status || 'draft',
                imageUrl: backendPost.cover_url ? this.getImageUrl(backendPost.cover_url) : undefined,
                coverImage: backendPost.cover_url ? this.getImageUrl(backendPost.cover_url) : undefined
            };

            // 清除文章列表缓存（新文章会影响列表）
            this.invalidateCache(/^articles_list/);

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
                author: siteConfig.author.name,
                publishDate: backendPost.updated_at || backendPost.created_at,
                readTime: Math.ceil(backendPost.content.length / 1000),
                category: backendPost.category_id ? `Category ${backendPost.category_id}` : 'Uncategorized',
                categoryId: backendPost.category_id ? backendPost.category_id.toString() : undefined,
                tags: post.tags || [],
                featured: post.featured || false,
                status: post.status || 'draft',
                imageUrl: backendPost.cover_url ? this.getImageUrl(backendPost.cover_url) : undefined,
                coverImage: backendPost.cover_url ? this.getImageUrl(backendPost.cover_url) : undefined
            };

            // 清除该文章的详情缓存和列表缓存
            this.invalidateCache(new RegExp(`^article_detail_${id}$`));
            this.invalidateCache(/^articles_list/);

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
                // 清除该文章的详情缓存和列表缓存
                this.invalidateCache(new RegExp(`^article_detail_${id}$`));
                this.invalidateCache(/^articles_list/);

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
            logger.error('Failed to get or create tag IDs:', error);
            return [];
        }
    }
}
