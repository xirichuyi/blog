// Smart cache manager for API responses and data management

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  onEvict?: (key: string, entry: CacheEntry<any>) => void;
}

export class SmartCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder = new Map<string, number>(); // For LRU eviction
  private accessCounter = 0;
  
  constructor(private options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      ...options
    };
  }

  // Set cache entry
  set<T>(key: string, data: T, customTtl?: number): void {
    const ttl = customTtl || this.options.ttl!;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize!) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  // Get cache entry
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);
    return entry.data;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  // Delete cache entry
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && this.options.onEvict) {
      this.options.onEvict(key, entry);
    }
    
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    if (this.options.onEvict) {
      for (const [key, entry] of this.cache) {
        this.options.onEvict(key, entry);
      }
    }
    
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  // Evict least recently used entry
  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  // Clean expired entries
  cleanExpired(): number {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize!,
      hitRate: 0, // Would need hit/miss tracking for accurate calculation
      entries
    };
  }

  // Invalidate entries by pattern
  invalidatePattern(pattern: RegExp): number {
    let invalidatedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.delete(key);
        invalidatedCount++;
      }
    }

    return invalidatedCount;
  }

  // Refresh entry TTL
  refresh(key: string, customTtl?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    entry.timestamp = Date.now();
    if (customTtl !== undefined) {
      entry.ttl = customTtl;
    }

    this.accessOrder.set(key, ++this.accessCounter);
    return true;
  }
}

// Global cache instance
export const globalCache = new SmartCacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 200,
  onEvict: (key, entry) => {
    console.debug(`Cache evicted: ${key} (age: ${Date.now() - entry.timestamp}ms)`);
  }
});

// Cache key generators
export const CacheKeys = {
  articles: (page?: number, pageSize?: number, status?: string) => 
    `articles:${page || 1}:${pageSize || 12}:${status || 'published'}`,
  
  article: (id: string) => `article:${id}`,
  
  articlesByCategory: (categoryId: string) => `articles:category:${categoryId}`,
  
  articlesByTag: (tagName: string) => `articles:tag:${tagName}`,
  
  categories: () => 'categories',
  
  tags: () => 'tags',
  
  relatedArticles: (articleId: string) => `related:${articleId}`
};
