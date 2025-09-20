// Global Cache Manager for API responses and application data

export interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

export class GlobalCache {
    private cache: Map<string, CacheItem<any>> = new Map();
    private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

    constructor(defaultTTL?: number) {
        if (defaultTTL) {
            this.defaultTTL = defaultTTL;
        }
    }

    // Set cache with optional TTL
    set<T>(key: string, data: T, ttl?: number): void {
        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
        };
        this.cache.set(key, item);
    }

    // Get cache item if not expired
    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) {
            return null;
        }

        // Check if expired
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data as T;
    }

    // Delete specific cache item
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    // Clear all cache
    clear(): void {
        this.cache.clear();
    }

    // Clean expired items
    cleanExpired(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
            }
        }
    }

    // Invalidate cache by pattern (RegExp)
    invalidatePattern(pattern: RegExp): void {
        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    // Get cache statistics
    getStats(): {
        size: number;
        keys: string[];
        expired: number;
    } {
        const now = Date.now();
        let expired = 0;
        const keys = Array.from(this.cache.keys());

        for (const item of this.cache.values()) {
            if (now - item.timestamp > item.ttl) {
                expired++;
            }
        }

        return {
            size: this.cache.size,
            keys,
            expired,
        };
    }

    // Check if key exists and is not expired
    has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) {
            return false;
        }

        // Check if expired
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }
}

// Global cache instance
export const globalCache = new GlobalCache();

// Cache keys constants
export const CacheKeys = {
    ARTICLES: 'articles',
    CATEGORIES: 'categories',
    TAGS: 'tags',
    MUSIC_TRACKS: 'music_tracks',
    DASHBOARD_STATS: 'dashboard_stats',
    SERVER_STATUS: 'server_status',
    USER_PROFILE: 'user_profile',
} as const;

// Helper function to generate cache key with parameters
export function generateCacheKey(base: string, params?: Record<string, any>): string {
    if (!params) {
        return base;
    }

    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    return `${base}:${sortedParams}`;
}

// Cache decorator for async functions
export function cached<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    ttl?: number
): T {
    return (async (...args: Parameters<T>) => {
        const key = keyGenerator(...args);
        const cached = globalCache.get(key);

        if (cached !== null) {
            return cached;
        }

        const result = await fn(...args);
        globalCache.set(key, result, ttl);
        return result;
    }) as T;
}
