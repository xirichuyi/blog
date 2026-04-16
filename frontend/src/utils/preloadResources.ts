import { apiService } from '../services/api';
import { globalCache } from './cacheManager';
import { logger } from './logger';

export async function preloadRouteResources(route: string): Promise<void> {
    try {
        switch (route) {
            case '/':
            case '/home':
                await Promise.allSettled([
                    preloadData('recent_articles', () => apiService.getArticles({ page: 1, page_size: 6, status: 'published' }), 5 * 60 * 1000),
                    preloadData('public_categories', () => apiService.getPublicCategories(), 10 * 60 * 1000),
                ]);
                break;
            case '/articles':
                await Promise.allSettled([
                    preloadData('articles_page_1', () => apiService.getArticles({ page: 1, page_size: 12, status: 'published' }), 3 * 60 * 1000),
                    preloadData('public_categories', () => apiService.getPublicCategories(), 10 * 60 * 1000),
                    preloadData('public_tags', () => apiService.getPublicTags(), 10 * 60 * 1000),
                ]);
                break;
            case '/admin':
            case '/admin/dashboard':
                await Promise.allSettled([
                    preloadData('dashboard_stats', () => apiService.getDashboardStats(), 2 * 60 * 1000),
                    preloadData('admin_articles', () => apiService.getPosts({ page: 1, page_size: 10 }), 2 * 60 * 1000),
                ]);
                break;
            default:
                if (route.startsWith('/article/')) {
                    await preloadData('recent_articles', () => apiService.getArticles({ page: 1, page_size: 6, status: 'published' }), 5 * 60 * 1000);
                }
                break;
        }
    } catch (error) {
        logger.warn(`Failed to preload resources for route ${route}:`, error);
    }
}

async function preloadData(key: string, fetcher: () => Promise<{ success: boolean; data?: unknown }>, ttl: number): Promise<void> {
    try {
        const response = await fetcher();
        if (response.success && response.data) {
            globalCache.set(key, response.data, ttl);
        }
    } catch (error) {
        logger.warn(`Failed to preload ${key}:`, error);
    }
}
