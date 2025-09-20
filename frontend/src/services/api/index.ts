// Main API service - combines all API modules

import { AuthApiService } from './auth';
import { PostsApiService } from './posts';
import { CategoriesApiService } from './categories';
import { TagsApiService } from './tags';
import { MusicApiService } from './music';
import { UploadsApiService } from './uploads';
import { AboutApiService } from './about';
import { HealthApiService } from './health';
import { storageService } from '../storage';
import type { ApiResponse, Article } from '../types';

/**
 * 统一的API服务类
 * 整合所有API模块，提供统一的接口
 */
class ApiService {
    // API模块实例
    private auth: AuthApiService;
    private posts: PostsApiService;
    private categories: CategoriesApiService;
    private tags: TagsApiService;
    private music: MusicApiService;
    private uploads: UploadsApiService;
    private about: AboutApiService;
    private health: HealthApiService;

    constructor() {
        this.auth = new AuthApiService();
        this.posts = new PostsApiService();
        this.categories = new CategoriesApiService();
        this.tags = new TagsApiService();
        this.music = new MusicApiService();
        this.uploads = new UploadsApiService();
        this.about = new AboutApiService();
        this.health = new HealthApiService();
    }

    // ========== 认证相关 ==========
    async login(credentials: { username: string; password: string }) {
        return this.auth.login(credentials);
    }

    async verifyToken() {
        return this.auth.verifyToken();
    }

    // ========== 文章相关 ==========
    async getArticles(params?: { status?: string; search?: string; category?: string; tag_id?: number; page?: number; limit?: number; page_size?: number }) {
        // 兼容旧的limit参数
        const normalizedParams = {
            ...params,
            page_size: params?.page_size || params?.limit
        };
        return this.posts.getPosts(normalizedParams);
    }

    async getPosts(params?: { status?: string; search?: string; category?: string; tag_id?: number; page?: number; page_size?: number }) {
        return this.posts.getPosts(params);
    }

    async getArticle(id: string) {
        return this.posts.getPost(id);
    }

    async getPost(id: string) {
        return this.posts.getPost(id);
    }

    async createArticle(article: Partial<Article> & { status: 'draft' | 'published' }) {
        return this.posts.createPost(article);
    }

    async createPost(post: Partial<Article> & { status: 'draft' | 'published' }) {
        return this.posts.createPost(post);
    }

    async updateArticle(id: string, article: Partial<Article> & { status?: 'draft' | 'published' | 'private' }) {
        return this.posts.updatePost(id, article);
    }

    async updatePost(id: string, post: Partial<Article> & { status?: 'draft' | 'published' | 'private' }) {
        return this.posts.updatePost(id, post);
    }

    async deleteArticle(id: string) {
        return this.posts.deletePost(id);
    }

    async deletePost(id: string) {
        return this.posts.deletePost(id);
    }

    async publishPost(id: string) {
        return this.posts.publishPost(id);
    }

    async unpublishPost(id: string) {
        return this.posts.unpublishPost(id);
    }

    // Legacy method for bulk delete (using storage service for compatibility)
    async bulkDeletePosts(ids: string[]): Promise<ApiResponse<void>> {
        try {
            await new Promise(resolve => setTimeout(resolve, 600));
            const success = storageService.deletePosts(ids);
            if (success) {
                return { success: true };
            } else {
                return { success: false, error: 'Some posts could not be deleted' };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete posts',
            };
        }
    }

    // ========== 分类相关 ==========
    async getCategories() {
        return this.categories.getCategories();
    }

    async getPublicCategories() {
        return this.categories.getPublicCategories();
    }

    async getPostsByCategory(categoryId: string) {
        return this.categories.getPostsByCategory(categoryId, { page_size: 12 });
    }

    async createCategory(categoryData: { name: string; description?: string; icon?: string }) {
        return this.categories.createCategory(categoryData);
    }

    async updateCategory(categoryId: string, categoryData: { name?: string; description?: string; icon?: string }) {
        return this.categories.updateCategory(categoryId, categoryData);
    }

    async deleteCategory(categoryId: string) {
        return this.categories.deleteCategory(categoryId);
    }

    // ========== 标签相关 ==========
    async getTags() {
        return this.tags.getPublicTags();
    }

    async getPublicTags() {
        return this.tags.getPublicTags();
    }

    async getPostsByTag(tagId: string) {
        return this.tags.getPostsByTag(tagId, { page_size: 12 });
    }

    async createTag(tagData: { name: string }) {
        return this.tags.createTag(tagData);
    }

    async updateTag(tagId: string, tagData: { name?: string }) {
        return this.tags.updateTag(tagId, tagData);
    }

    async deleteTag(tagId: string) {
        return this.tags.deleteTag(tagId);
    }

    // ========== 音乐相关 ==========
    async getMusicTracks(params?: { search?: string; genre?: string; page?: number; page_size?: number }) {
        return this.music.getMusicTracks(params);
    }

    async uploadMusic(formData: FormData) {
        return this.music.uploadMusic(formData);
    }

    async deleteMusic(id: string) {
        return this.music.deleteMusic(id);
    }

    async bulkDeleteMusic(ids: string[]) {
        return this.music.bulkDeleteMusic(ids);
    }

    // ========== 文件上传相关 ==========
    async uploadFile(file: File, type: 'image' | 'audio' | 'document') {
        return this.uploads.uploadFile(file, type);
    }

    async uploadPostCover(file: File, postId?: string) {
        return this.uploads.uploadPostCover(file, postId);
    }

    async uploadPostImage(file: File) {
        return this.uploads.uploadPostImage(file);
    }

    // ========== 关于页面相关 ==========
    async getAbout() {
        return this.about.getAbout();
    }

    async updateAbout(payload: { title?: string; subtitle?: string; content?: string; photo_url?: string }) {
        return this.about.updateAbout(payload);
    }

    // ========== 健康检查和统计相关 ==========
    async healthCheck() {
        return this.health.healthCheck();
    }

    async detailedHealthCheck() {
        return this.health.detailedHealthCheck();
    }

    async getDashboardStats() {
        return this.health.getDashboardStats();
    }

    // ========== 工具方法 ==========
    getImageUrl(imagePath: string): string {
        return this.uploads.getImageUrl(imagePath);
    }

    // 缓存管理方法
    invalidateCachePattern(pattern: RegExp): void {
        this.posts.invalidateCachePattern(pattern);
    }

    clearCache(): void {
        this.posts.clearCache();
    }

    // 公共方法设置缓存，供DataContext使用
    setCachedData<T>(key: string, data: T, ttl?: number): void {
        this.posts.setPublicCachedData(key, data, ttl);
    }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

// Export individual services for direct use if needed
export {
    AuthApiService,
    PostsApiService,
    CategoriesApiService,
    TagsApiService,
    MusicApiService,
    UploadsApiService,
    AboutApiService,
    HealthApiService
};
