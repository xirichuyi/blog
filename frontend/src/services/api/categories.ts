// Categories API service

import { BaseApiService } from './base';
import type { Category, Article, ApiResponse, BackendListResponse } from '../types';
import { generateCacheKey } from '../../utils/cacheManager';

// 缓存有效期：10分钟（分类变化不频繁）
const CATEGORIES_CACHE_TTL = 10 * 60 * 1000;

export class CategoriesApiService extends BaseApiService {
    // Category Management APIs
    async getCategories(): Promise<ApiResponse<Category[]>> {
        return this.getPublicCategories();
    }

    // Public Categories API - 带缓存
    async getPublicCategories(forceRefresh = false): Promise<ApiResponse<Category[]>> {
        const cacheKey = 'categories';

        // 检查缓存（除非强制刷新）
        if (!forceRefresh) {
            const cached = this.getCachedData<Category[]>(cacheKey);
            if (cached) {
                return { success: true, data: cached };
            }
        }

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

                // 存入缓存
                this.setCachedData(cacheKey, categories, CATEGORIES_CACHE_TTL);

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

    // Get articles by category
    async getPostsByCategory(categoryId: string, params?: { page_size?: number }): Promise<ApiResponse<Article[]>> {
        try {
            if (categoryId === 'all') {
                // This will need to use the posts service
                // For now, we'll make a direct request
                return this.request(`/post/list_with_details?page_size=${params?.page_size || 12}`);
            }

            // Use the backend's category filtering by passing category_id as a number
            const categoryIdNum = parseInt(categoryId);
            if (isNaN(categoryIdNum)) {
                return {
                    success: false,
                    error: 'Invalid category ID',
                };
            }

            const queryParams = new URLSearchParams();
            queryParams.append('category_id', categoryId);
            if (params?.page_size) {
                queryParams.append('page_size', params.page_size.toString());
            }

            return this.request(`/post/list_with_details?${queryParams.toString()}`);
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch posts by category',
            };
        }
    }

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
}
