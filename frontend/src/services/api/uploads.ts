// File Upload API service

import { BaseApiService } from './base';
import type { UploadResponse, ApiResponse } from '../types';
import { logger } from '../../utils/logger';

export class UploadsApiService extends BaseApiService {

    /**
     * Upload a file directly to R2 via presigned URL.
     * Falls back to server upload if presign fails.
     * Returns the public URL of the uploaded file.
     */
    private async directUploadToR2(
        file: File,
        subfolder: string,
        contentType?: string,
    ): Promise<{ url: string } | null> {
        try {
            const ct = contentType || file.type || 'application/octet-stream';

            // 1. Get presigned URL from backend
            const presignRes = await fetch(`${this.baseURL}/admin/upload/presign`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    file_name: file.name,
                    content_type: ct,
                    subfolder,
                }),
            });

            if (!presignRes.ok) return null;
            const presignData = await presignRes.json();
            if (presignData.code !== 200 || !presignData.data) return null;

            const { presigned_url, public_url } = presignData.data;

            // 2. Upload directly to R2
            const uploadRes = await fetch(presigned_url, {
                method: 'PUT',
                headers: { 'Content-Type': ct },
                body: file,
            });

            if (!uploadRes.ok) {
                logger.warn('R2 direct upload failed, status:', uploadRes.status);
                return null;
            }

            logger.debug('R2 direct upload OK:', public_url);
            return { url: public_url };
        } catch (e) {
            logger.warn('R2 direct upload error, falling back to server upload:', e);
            return null;
        }
    }

    // File Upload APIs — direct to R2, fallback to server
    async uploadFile(file: File, type: 'image' | 'audio' | 'document'): Promise<ApiResponse<UploadResponse>> {
        const subfolderMap = { image: 'images', audio: 'music', document: 'documents' };
        const r2Result = await this.directUploadToR2(file, subfolderMap[type] || 'documents');
        if (r2Result) {
            return { success: true, data: { file_url: r2Result.url, file_name: file.name, file_size: file.size } as any };
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        try {
            const response = await fetch(`${this.baseURL}/download/upload_file`, {
                method: 'POST',
                headers: this.getUploadHeaders(),
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `HTTP error! status: ${response.status}`);

            return { success: true, data: data.data || data };
        } catch (error) {
            logger.error('File upload failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
        }
    }

    // Upload post cover image — direct to R2, fallback to server
    async uploadPostCover(file: File, postId?: string): Promise<ApiResponse<{ file_url: string }>> {
        const r2Result = await this.directUploadToR2(file, 'covers');
        if (r2Result) {
            return { success: true, data: { file_url: r2Result.url } };
        }
        const formData = new FormData();
        formData.append('cover', file);

        try {
            const endpoint = postId ? `/post/update_cover/${postId}` : '/post/upload_post_image';
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: postId ? 'PUT' : 'POST',
                headers: this.getUploadHeaders(),
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            let extractedData;
            if (data.data && (data.data.file_url || data.data.cover_url)) {
                extractedData = { ...data.data, file_url: data.data.file_url || data.data.cover_url };
            } else if (data.file_url || data.cover_url) {
                extractedData = { ...data, file_url: data.file_url || data.cover_url };
            } else {
                throw new Error('Invalid response structure: missing file_url or cover_url');
            }

            return { success: true, data: extractedData };
        } catch (error) {
            logger.error('Cover upload failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Cover upload failed' };
        }
    }

    // Upload post content image — direct to R2, fallback to server
    async uploadPostImage(file: File): Promise<ApiResponse<{ file_url: string }>> {
        const r2Result = await this.directUploadToR2(file, 'images');
        if (r2Result) {
            return { success: true, data: { file_url: r2Result.url } };
        }
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`${this.baseURL}/post/upload_post_image`, {
                method: 'POST',
                headers: this.getUploadHeaders(),
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            const extractedData = data.data?.file_url ? data.data : data.file_url ? data : null;
            if (!extractedData) throw new Error('Invalid response structure: missing file_url');

            return { success: true, data: extractedData };
        } catch (error) {
            logger.error('Image upload failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Image upload failed' };
        }
    }

    // Upload PDF file — direct to R2, fallback to server
    async uploadPdf(file: File, postId?: number): Promise<ApiResponse<{ file_url: string; file_name: string }>> {
        const MAX_PDF_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_PDF_SIZE) {
            return { success: false, error: 'PDF file size exceeds 50MB limit' };
        }

        const r2Result = await this.directUploadToR2(file, 'pdfs', 'application/pdf');
        if (r2Result) {
            return { success: true, data: { file_url: r2Result.url, file_name: file.name } };
        }
        const formData = new FormData();
        formData.append('file', file);
        if (postId) formData.append('post_id', postId.toString());

        try {
            const response = await fetch(`${this.baseURL}/pdf/upload`, {
                method: 'POST',
                headers: this.getUploadHeaders(),
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `HTTP error! status: ${response.status}`);

            const extractedData = data.data?.file_url ? data.data : data.file_url ? data : null;
            if (!extractedData) throw new Error('Invalid response structure: missing file_url');

            return { success: true, data: extractedData };
        } catch (error) {
            logger.error('PDF upload failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'PDF upload failed' };
        }
    }
}
