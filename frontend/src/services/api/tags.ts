// Tags API service

import { BaseApiService } from './base';
import type { Tag, Article, ApiResponse } from '../types';

// Backend response typing helpers
interface BackendListResponse<T> {
    data: T[];
    total?: number;
    page?: number;
    page_size?: number;
}

interface BackendTag {
    id: number;
    name: string;
}

export class TagsApiService extends BaseApiService {
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

    // Get articles by tag - now using backend filtering
    async getPostsByTag(tagId: string, params?: { page_size?: number }): Promise<ApiResponse<Article[]>> {
        try {
            // Convert tagId to number for backend API
            const tagIdNum = parseInt(tagId);
            if (isNaN(tagIdNum)) {
                return {
                    success: false,
                    error: 'Invalid tag ID',
                };
            }

            const queryParams = new URLSearchParams();
            queryParams.append('tag_id', tagIdNum.toString());
            if (params?.page_size) {
                queryParams.append('page_size', params.page_size.toString());
            }

            // Use the optimized backend endpoint with tag filtering
            return this.request(`/post/list_with_details?${queryParams.toString()}`);
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch posts by tag',
            };
        }
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
