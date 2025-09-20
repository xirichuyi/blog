// Base API service with common functionality

import { globalCache } from '../../utils/cacheManager';
import type { ApiResponse } from '../types';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://172.245.148.234:3007';
export const API_PREFIX = '/api';

export class BaseApiService {
    protected baseURL: string;

    constructor() {
        this.baseURL = `${API_BASE_URL}${API_PREFIX}`;

        // Clean expired cache entries periodically
        setInterval(() => {
            globalCache.cleanExpired();
        }, 60000); // Every minute
    }

    // Helper function to clean Markdown content and generate plain text excerpt
    protected generatePlainTextExcerpt(content: string, maxLength: number = 80): string {
        if (!content) return '';

        // Remove Markdown syntax
        let plainText = content
            // Remove headers
            .replace(/^#{1,6}\s+/gm, '')
            // Remove bold and italic
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, '')
            // Remove inline code
            .replace(/`([^`]+)`/g, '$1')
            // Remove links but keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove images
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
            // Remove blockquotes
            .replace(/^>\s+/gm, '')
            // Remove lists
            .replace(/^[\s]*[-*+]\s+/gm, '')
            .replace(/^[\s]*\d+\.\s+/gm, '')
            // Remove horizontal rules
            .replace(/^---$/gm, '')
            // Remove HTML tags
            .replace(/<[^>]*>/g, '')
            // Remove extra whitespace and newlines
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Truncate to maxLength and add ellipsis if needed
        if (plainText.length > maxLength) {
            plainText = plainText.substring(0, maxLength).trim();
            // Try to break at a word boundary
            const lastSpaceIndex = plainText.lastIndexOf(' ');
            if (lastSpaceIndex > maxLength * 0.8) { // Only break at word if it's not too early
                plainText = plainText.substring(0, lastSpaceIndex);
            }
            plainText += '...';
        }

        return plainText;
    }

    // Enhanced cache methods using global cache manager
    protected getCachedData<T>(key: string): T | null {
        return globalCache.get<T>(key);
    }

    protected setCachedData<T>(key: string, data: T, ttl?: number): void {
        globalCache.set(key, data, ttl);
    }

    protected invalidateCache(pattern: RegExp): void {
        globalCache.invalidatePattern(pattern);
    }

    // 公共方法供外部使用
    public invalidateCachePattern(pattern: RegExp): void {
        this.invalidateCache(pattern);
    }

    // 清理缓存方法
    public clearCache(): void {
        globalCache.clear();
    }

    // 公共方法设置缓存，供DataContext使用
    public setPublicCachedData<T>(key: string, data: T, ttl?: number): void {
        this.setCachedData(key, data, ttl);
    }

    // Get headers for API requests
    protected getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add auth token if available
        const token = localStorage.getItem('admin_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Helper method to get auth headers for file uploads (without Content-Type)
    protected getUploadHeaders(): HeadersInit {
        const token = localStorage.getItem('admin_token');
        return {
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    }

    // Helper method to get auth headers
    protected getAuthHeaders(): HeadersInit {
        const token = localStorage.getItem('admin_token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    }

    // Generic request method
    protected async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: this.getAuthHeaders(),
                ...options,
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response: ${text}`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return {
                success: true,
                data,
            };
        } catch (error) {
            console.error('API request failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    // Get full image URL (helper method)
    getImageUrl(imagePath: string): string {
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        return `${API_BASE_URL}${imagePath}`;
    }

    // Helper method to get category icon
    protected getCategoryIcon(categoryName: string): string {
        const iconMap: Record<string, string> = {
            // Real categories from our backend
            '技术分享': 'share',
            'Web开发': 'web',
            'Rust编程': 'code',
            // Legacy categories for backward compatibility
            'Development': 'code',
            'Design': 'palette',
            'Technology': 'computer',
            'React': 'code',
            'Rust': 'code',
            'JavaScript': 'code',
            'TypeScript': 'code',
            'Web Development': 'web',
            'Mobile': 'phone_android',
            'AI': 'psychology',
            'Machine Learning': 'psychology',
            'Tutorial': 'school',
            'News': 'newspaper',
            'Review': 'rate_review'
        };

        return iconMap[categoryName] || 'article';
    }
}
