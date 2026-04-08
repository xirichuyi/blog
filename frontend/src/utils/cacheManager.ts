interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class GlobalCache {
    private cache = new Map<string, CacheItem<unknown>>();
    private defaultTTL = 5 * 60 * 1000;

    set<T>(key: string, data: T, ttl?: number): void {
        this.cache.set(key, { data, timestamp: Date.now(), ttl: ttl || this.defaultTTL });
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }
        return item.data as T;
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    cleanExpired(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) this.cache.delete(key);
        }
    }

    invalidatePattern(pattern: RegExp): void {
        for (const key of this.cache.keys()) {
            if (pattern.test(key)) this.cache.delete(key);
        }
    }
}

export const globalCache = new GlobalCache();

export function generateCacheKey(base: string, params?: Record<string, unknown>): string {
    if (!params) return base;
    const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    return `${base}:${sorted}`;
}
