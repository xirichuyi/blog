// API service facade — thin pass-through to individual service modules

import { AuthApiService } from './auth';
import { PostsApiService } from './posts';
import { CategoriesApiService } from './categories';
import { TagsApiService } from './tags';
import { MusicApiService } from './music';
import { UploadsApiService } from './uploads';
import { AboutApiService } from './about';
import { HealthApiService } from './health';
import { ResourceApiService } from './resources';
import { WebauthnApiService } from './webauthn';
import type { Article, LoginCredentials } from '../types';

const auth = new AuthApiService();
const posts = new PostsApiService();
const categories = new CategoriesApiService();
const tags = new TagsApiService();
const music = new MusicApiService();
const uploads = new UploadsApiService();
const about = new AboutApiService();
const health = new HealthApiService();
const resources = new ResourceApiService();
const webauthn = new WebauthnApiService();

export const apiService = {
  // Auth
  login: (credentials: LoginCredentials) => auth.login(credentials),
  verifyToken: () => auth.verifyToken(),

  // Posts
  getPosts: posts.getPosts.bind(posts),
  getPost: posts.getPost.bind(posts),
  getArticles: posts.getPosts.bind(posts),
  getArticle: posts.getPost.bind(posts),
  createPost: (post: Partial<Article> & { status: 'draft' | 'published' }) => posts.createPost(post),
  updatePost: (id: string, post: Partial<Article> & { status?: 'draft' | 'published' | 'private' }) => posts.updatePost(id, post),
  deletePost: (id: string) => posts.deletePost(id),
  publishPost: (id: string) => posts.publishPost(id),
  unpublishPost: (id: string) => posts.unpublishPost(id),

  // Categories
  getCategories: () => categories.getCategories(),
  getPublicCategories: () => categories.getPublicCategories(),
  getPostsByCategory: (id: string) => categories.getPostsByCategory(id, { page_size: 12 }),
  createCategory: (data: { name: string; description?: string; icon?: string }) => categories.createCategory(data),
  updateCategory: (id: string, data: { name?: string; description?: string; icon?: string }) => categories.updateCategory(id, data),
  deleteCategory: (id: string) => categories.deleteCategory(id),

  // Tags
  getTags: () => tags.getPublicTags(),
  getPublicTags: () => tags.getPublicTags(),
  getPostsByTag: (id: string) => tags.getPostsByTag(id, { page_size: 12 }),
  createTag: (data: { name: string }) => tags.createTag(data),
  updateTag: (id: string, data: { name?: string }) => tags.updateTag(id, data),
  deleteTag: (id: string) => tags.deleteTag(id),

  // Music
  getMusicTracks: music.getMusicTracks.bind(music),
  uploadMusic: (formData: FormData) => music.uploadMusic(formData),
  deleteMusic: (id: string) => music.deleteMusic(id),
  bulkDeleteMusic: (ids: string[]) => music.bulkDeleteMusic(ids),

  // Uploads
  uploadFile: (file: File, type: 'image' | 'audio' | 'document') => uploads.uploadFile(file, type),
  uploadPostCover: (file: File, postId?: string) => uploads.uploadPostCover(file, postId),
  uploadPostImage: (file: File) => uploads.uploadPostImage(file),
  uploadPdf: (file: File, postId?: number) => uploads.uploadPdf(file, postId),
  getImageUrl: (path: string) => uploads.getImageUrl(path),

  // About
  getAbout: () => about.getAbout(),
  updateAbout: (payload: { title?: string; subtitle?: string; content?: string; photo_url?: string }) => about.updateAbout(payload),

  // Health & Dashboard
  healthCheck: () => health.healthCheck(),
  detailedHealthCheck: () => health.detailedHealthCheck(),
  getDashboardStats: () => health.getDashboardStats(),

  // Cache
  invalidateCachePattern: (pattern: RegExp) => posts.invalidateCachePattern(pattern),
  clearCache: () => posts.clearCache(),
  setCachedData: <T>(key: string, data: T, ttl?: number) => posts.setPublicCachedData(key, data, ttl),

  // Resources
  listResources: (fileType?: string, used?: boolean) => resources.listResources(fileType, used),
  getResourceStats: () => resources.getResourceStats(),
  deleteResource: (path: string) => resources.deleteResource(path),
  optimizeAllImages: () => resources.optimizeAllImages(),
  cleanupUnusedResources: () => resources.cleanupUnused(),

  // WebAuthn
  webauthnHasCredentials: () => webauthn.hasCredentials(),
  webauthnAuthStart: () => webauthn.authStart(),
  webauthnAuthFinish: (credential: PublicKeyCredential, challengeId: string) => webauthn.authFinish(credential, challengeId),
  webauthnRegisterStart: () => webauthn.registerStart(),
  webauthnRegisterFinishRaw: (credentialData: any, name: string, challengeId: string) => webauthn.registerFinishRaw(credentialData, name, challengeId),
  webauthnListCredentials: () => webauthn.listCredentials(),
  webauthnDeleteCredential: (id: string) => webauthn.deleteCredential(id),
};

export default apiService;

export type { StaticResource, ResourceUsage, UsageRef, ResourceStats, TypeStats, OptimizeResult } from './resources';
