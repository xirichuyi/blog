// Main API service - combines all API modules

import { AuthApiService } from './auth';
import { PostsApiService } from './posts';
import { CategoriesApiService } from './categories';
import { TagsApiService } from './tags';
import { MusicApiService } from './music';
import { UploadsApiService } from './uploads';
import { AboutApiService } from './about';
import { HealthApiService } from './health';
import type { Article } from '../types';

/**
 * 统一的API服务类
 * 整合所有API模块，提供统一的接口
 */
class ApiService {
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
    login(credentials: { username: string; password: string }) {
        return this.auth.login(credentials);
    }

    verifyToken() {
        return this.auth.verifyToken();
    }

    // ========== 文章相关 ==========
    getPosts(params?: { status?: string; search?: string; category?: string; tag_id?: number; page?: number; page_size?: number }) {
        return this.posts.getPosts(params);
    }

    // 兼容旧代码的别名 (getArticles/getArticle still widely used)
    getArticles = this.getPosts.bind(this);

    getPost(id: string) {
        return this.posts.getPost(id);
    }

    getArticle = this.getPost.bind(this);

    createPost(post: Partial<Article> & { status: 'draft' | 'published' }) {
        return this.posts.createPost(post);
    }

    updatePost(id: string, post: Partial<Article> & { status?: 'draft' | 'published' | 'private' }) {
        return this.posts.updatePost(id, post);
    }

    deletePost(id: string) {
        return this.posts.deletePost(id);
    }

    publishPost(id: string) {
        return this.posts.publishPost(id);
    }

    unpublishPost(id: string) {
        return this.posts.unpublishPost(id);
    }

    // ========== 分类相关 ==========
    getCategories() {
        return this.categories.getCategories();
    }

    getPublicCategories() {
        return this.categories.getPublicCategories();
    }

    getPostsByCategory(categoryId: string) {
        return this.categories.getPostsByCategory(categoryId, { page_size: 12 });
    }

    createCategory(categoryData: { name: string; description?: string; icon?: string }) {
        return this.categories.createCategory(categoryData);
    }

    updateCategory(categoryId: string, categoryData: { name?: string; description?: string; icon?: string }) {
        return this.categories.updateCategory(categoryId, categoryData);
    }

    deleteCategory(categoryId: string) {
        return this.categories.deleteCategory(categoryId);
    }

    // ========== 标签相关 ==========
    getTags() {
        return this.tags.getPublicTags();
    }

    getPublicTags() {
        return this.tags.getPublicTags();
    }

    getPostsByTag(tagId: string) {
        return this.tags.getPostsByTag(tagId, { page_size: 12 });
    }

    createTag(tagData: { name: string }) {
        return this.tags.createTag(tagData);
    }

    updateTag(tagId: string, tagData: { name?: string }) {
        return this.tags.updateTag(tagId, tagData);
    }

    deleteTag(tagId: string) {
        return this.tags.deleteTag(tagId);
    }

    // ========== 音乐相关 ==========
    getMusicTracks(params?: { search?: string; genre?: string; page?: number; page_size?: number }) {
        return this.music.getMusicTracks(params);
    }

    uploadMusic(formData: FormData) {
        return this.music.uploadMusic(formData);
    }

    deleteMusic(id: string) {
        return this.music.deleteMusic(id);
    }

    bulkDeleteMusic(ids: string[]) {
        return this.music.bulkDeleteMusic(ids);
    }

    // ========== 文件上传相关 ==========
    uploadFile(file: File, type: 'image' | 'audio' | 'document') {
        return this.uploads.uploadFile(file, type);
    }

    uploadPostCover(file: File, postId?: string) {
        return this.uploads.uploadPostCover(file, postId);
    }

    uploadPostImage(file: File) {
        return this.uploads.uploadPostImage(file);
    }

    uploadPdf(file: File, postId?: number) {
        return this.uploads.uploadPdf(file, postId);
    }

    getImageUrl(imagePath: string): string {
        return this.uploads.getImageUrl(imagePath);
    }

    // ========== 关于页面相关 ==========
    getAbout() {
        return this.about.getAbout();
    }

    updateAbout(payload: { title?: string; subtitle?: string; content?: string; photo_url?: string }) {
        return this.about.updateAbout(payload);
    }

    // ========== 健康检查和统计相关 ==========
    healthCheck() {
        return this.health.healthCheck();
    }

    detailedHealthCheck() {
        return this.health.detailedHealthCheck();
    }

    getDashboardStats() {
        return this.health.getDashboardStats();
    }

    // ========== 缓存管理 ==========
    invalidateCachePattern(pattern: RegExp): void {
        this.posts.invalidateCachePattern(pattern);
    }

    clearCache(): void {
        this.posts.clearCache();
    }

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
