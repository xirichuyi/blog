// Admin-specific preloading utilities

import { apiService } from '../services/api';
import { globalCache } from './cacheManager';

// Initialize admin-specific preloading
export async function initAdminPreloading(): Promise<void> {
    try {
        // Only preload if user is authenticated as admin
        const token = localStorage.getItem('admin_token');
        if (!token) {
            return;
        }

        // Preload admin data in parallel
        await Promise.allSettled([
            preloadDashboardData(),
            preloadAdminPosts(),
            preloadAdminCategories(),
            preloadAdminTags(),
            preloadMusicTracks(),
        ]);
    } catch (error) {
        console.warn('Failed to preload admin resources:', error);
    }
}

// Preload dashboard statistics
async function preloadDashboardData(): Promise<void> {
    try {
        const response = await apiService.getDashboardStats();
        if (response.success && response.data) {
            globalCache.set('admin_dashboard_stats', response.data, 2 * 60 * 1000); // 2 minutes
        }
    } catch (error) {
        console.warn('Failed to preload dashboard data:', error);
    }
}

// Preload admin posts (including drafts)
async function preloadAdminPosts(): Promise<void> {
    try {
        const response = await apiService.getPosts({
            page: 1,
            page_size: 20
        });
        if (response.success && response.data) {
            globalCache.set('admin_posts_page_1', response.data, 3 * 60 * 1000); // 3 minutes
        }
    } catch (error) {
        console.warn('Failed to preload admin posts:', error);
    }
}

// Preload categories for admin management
async function preloadAdminCategories(): Promise<void> {
    try {
        const response = await apiService.getCategories();
        if (response.success && response.data) {
            globalCache.set('admin_categories', response.data, 5 * 60 * 1000); // 5 minutes
        }
    } catch (error) {
        console.warn('Failed to preload admin categories:', error);
    }
}

// Preload tags for admin management
async function preloadAdminTags(): Promise<void> {
    try {
        const response = await apiService.getPublicTags();
        if (response.success && response.data) {
            globalCache.set('admin_tags', response.data, 5 * 60 * 1000); // 5 minutes
        }
    } catch (error) {
        console.warn('Failed to preload admin tags:', error);
    }
}

// Preload music tracks for admin
async function preloadMusicTracks(): Promise<void> {
    try {
        const response = await apiService.getMusicTracks({
            page: 1,
            page_size: 20
        });
        if (response.success && response.data) {
            globalCache.set('admin_music_tracks', response.data, 3 * 60 * 1000); // 3 minutes
        }
    } catch (error) {
        console.warn('Failed to preload music tracks:', error);
    }
}

// Preload specific admin route data
export async function preloadAdminRoute(route: string): Promise<void> {
    try {
        switch (route) {
            case '/admin/dashboard':
                await preloadDashboardData();
                break;

            case '/admin/posts':
                await Promise.allSettled([
                    preloadAdminPosts(),
                    preloadAdminCategories(),
                    preloadAdminTags(),
                ]);
                break;

            case '/admin/posts/new':
            case '/admin/posts/edit':
                await Promise.allSettled([
                    preloadAdminCategories(),
                    preloadAdminTags(),
                ]);
                break;

            case '/admin/categories-tags':
                await Promise.allSettled([
                    preloadAdminCategories(),
                    preloadAdminTags(),
                ]);
                break;

            case '/admin/music':
                await preloadMusicTracks();
                break;

            case '/admin/about':
                await preloadAboutData();
                break;

            default:
                // Default admin preloading
                await preloadDashboardData();
                break;
        }
    } catch (error) {
        console.warn(`Failed to preload admin route ${route}:`, error);
    }
}

// Preload about page data for admin editing
async function preloadAboutData(): Promise<void> {
    try {
        const response = await apiService.getAbout();
        if (response.success && response.data) {
            globalCache.set('admin_about_data', response.data, 5 * 60 * 1000); // 5 minutes
        }
    } catch (error) {
        console.warn('Failed to preload about data:', error);
    }
}

// Background refresh for admin data
export function startAdminBackgroundRefresh(): void {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        return;
    }

    // Refresh every 5 minutes
    setInterval(async () => {
        try {
            await Promise.allSettled([
                preloadDashboardData(),
                preloadAdminPosts(),
            ]);
        } catch (error) {
            console.warn('Background refresh failed:', error);
        }
    }, 5 * 60 * 1000);
}

// Preload admin assets (admin-specific CSS, icons, etc.)
export function preloadAdminAssets(): void {
    // Preload admin-specific icons and assets
    const adminAssets = [
        '/assets/icons/admin-dashboard.svg',
        '/assets/icons/admin-posts.svg',
        '/assets/icons/admin-settings.svg',
    ];

    adminAssets.forEach(assetUrl => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = assetUrl;
        document.head.appendChild(link);
    });
}

// Clear admin cache on logout
export function clearAdminCache(): void {
    const adminKeys = [
        'admin_dashboard_stats',
        'admin_posts_page_1',
        'admin_categories',
        'admin_tags',
        'admin_music_tracks',
        'admin_about_data',
    ];

    adminKeys.forEach(key => {
        globalCache.delete(key);
    });
}
