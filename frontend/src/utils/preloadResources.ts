// Resource preloading utilities for better performance

import { apiService } from '../services/api';
import { globalCache } from './cacheManager';

// Preload critical resources for the application
export async function initPreloading(): Promise<void> {
    try {
        // Preload critical data in parallel
        await Promise.allSettled([
            preloadCategories(),
            preloadTags(),
            preloadRecentArticles(),
        ]);
    } catch (error) {
        console.warn('Failed to preload some resources:', error);
    }
}

// Preload categories
async function preloadCategories(): Promise<void> {
    try {
        const response = await apiService.getPublicCategories();
        if (response.success && response.data) {
            globalCache.set('public_categories', response.data, 10 * 60 * 1000); // 10 minutes
        }
    } catch (error) {
        console.warn('Failed to preload categories:', error);
    }
}

// Preload tags
async function preloadTags(): Promise<void> {
    try {
        const response = await apiService.getPublicTags();
        if (response.success && response.data) {
            globalCache.set('public_tags', response.data, 10 * 60 * 1000); // 10 minutes
        }
    } catch (error) {
        console.warn('Failed to preload tags:', error);
    }
}

// Preload recent articles for home page
async function preloadRecentArticles(): Promise<void> {
    try {
        const response = await apiService.getArticles({
            page: 1,
            page_size: 6,
            status: 'published'
        });
        if (response.success && response.data) {
            globalCache.set('recent_articles', response.data, 5 * 60 * 1000); // 5 minutes
        }
    } catch (error) {
        console.warn('Failed to preload recent articles:', error);
    }
}

// Preload resources based on route
export async function preloadRouteResources(route: string): Promise<void> {
    try {
        switch (route) {
            case '/':
            case '/home':
                await Promise.allSettled([
                    preloadRecentArticles(),
                    preloadCategories(),
                ]);
                break;

            case '/articles':
                await Promise.allSettled([
                    preloadArticles(),
                    preloadCategories(),
                    preloadTags(),
                ]);
                break;

            case '/admin':
            case '/admin/dashboard':
                await preloadAdminData();
                break;

            default:
                // For dynamic routes like /article/:id, preload based on pattern
                if (route.startsWith('/article/')) {
                    await preloadRecentArticles();
                }
                break;
        }
    } catch (error) {
        console.warn(`Failed to preload resources for route ${route}:`, error);
    }
}

// Preload articles for articles page
async function preloadArticles(): Promise<void> {
    try {
        const response = await apiService.getArticles({
            page: 1,
            page_size: 12,
            status: 'published'
        });
        if (response.success && response.data) {
            globalCache.set('articles_page_1', response.data, 3 * 60 * 1000); // 3 minutes
        }
    } catch (error) {
        console.warn('Failed to preload articles:', error);
    }
}

// Preload admin dashboard data
async function preloadAdminData(): Promise<void> {
    try {
        await Promise.allSettled([
            preloadDashboardStats(),
            preloadAdminArticles(),
        ]);
    } catch (error) {
        console.warn('Failed to preload admin data:', error);
    }
}

// Preload dashboard statistics
async function preloadDashboardStats(): Promise<void> {
    try {
        const response = await apiService.getDashboardStats();
        if (response.success && response.data) {
            globalCache.set('dashboard_stats', response.data, 2 * 60 * 1000); // 2 minutes
        }
    } catch (error) {
        console.warn('Failed to preload dashboard stats:', error);
    }
}

// Preload admin articles (including drafts)
async function preloadAdminArticles(): Promise<void> {
    try {
        const response = await apiService.getPosts({
            page: 1,
            page_size: 10
        });
        if (response.success && response.data) {
            globalCache.set('admin_articles', response.data, 2 * 60 * 1000); // 2 minutes
        }
    } catch (error) {
        console.warn('Failed to preload admin articles:', error);
    }
}

// Preload critical CSS and fonts
export function preloadCriticalAssets(): void {
    // Preload critical fonts
    const criticalFonts = [
        '/assets/fonts/roboto-regular.woff2',
        '/assets/fonts/roboto-medium.woff2',
    ];

    criticalFonts.forEach(fontUrl => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        link.href = fontUrl;
        document.head.appendChild(link);
    });

    // Preload critical images
    const criticalImages = [
        '/assets/images/hero-bg.webp',
        '/assets/images/default-avatar.webp',
    ];

    criticalImages.forEach(imageUrl => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = imageUrl;
        document.head.appendChild(link);
    });
}

// Background preloading for better UX
export function startBackgroundPreloading(): void {
    // Wait for page to be fully loaded before background preloading
    if (document.readyState === 'complete') {
        backgroundPreload();
    } else {
        window.addEventListener('load', backgroundPreload);
    }
}

function backgroundPreload(): void {
    // Use requestIdleCallback for non-critical preloading
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            initPreloading();
        });
    } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
            initPreloading();
        }, 2000);
    }
}
