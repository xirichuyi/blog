// Health Check API service

import { BaseApiService } from './base';
import type { DashboardStats, ApiResponse } from '../types';

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

interface BackendMusic {
    id: number;
    music_name: string;
    music_author: string;
    music_url: string;
    music_cover_url?: string;
    status: number;
    created_at: string;
    updated_at: string;
}

export class HealthApiService extends BaseApiService {
    // Health Check
    async healthCheck(): Promise<ApiResponse<{ status: string }>> {
        return this.request('/health');
    }

    // Detailed Health Check
    async detailedHealthCheck(): Promise<ApiResponse<Record<string, unknown>>> {
        return this.request('/health/detailed');
    }

    // Dashboard APIs - mock implementation since backend doesn't have this endpoint
    async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
        try {
            // Get posts count
            const postsResponse = await this.request<BackendListResponse<BackendPost>>('/post/list?page_size=1');
            const postsCount = postsResponse.data?.total || 0;

            // Get music count
            const musicResponse = await this.request<BackendListResponse<BackendMusic>>('/music/list?page_size=1');
            const musicCount = musicResponse.data?.total || 0;

            // Mock dashboard stats
            const stats: DashboardStats = {
                total_posts: postsCount,
                total_categories: 5, // Mock value
                total_tags: 10, // Mock value
                total_music: musicCount,
                recent_posts: [], // Empty array for now
                system_info: {
                    uptime: '24h',
                    memory_usage: '512MB',
                    disk_usage: '2GB'
                }
            };

            return {
                success: true,
                data: stats,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get dashboard stats',
            };
        }
    }
}
