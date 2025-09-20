// File Upload API service

import { BaseApiService } from './base';
import type { UploadResponse, ApiResponse } from '../types';

export class UploadsApiService extends BaseApiService {
    // File Upload APIs
    async uploadFile(file: File, type: 'image' | 'audio' | 'document'): Promise<ApiResponse<UploadResponse>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        try {
            const authToken = localStorage.getItem('admin_token');
            if (!authToken) {
                return {
                    success: false,
                    error: 'Authentication token not found. Please log in to upload files.',
                };
            }

            const response = await fetch(`${this.baseURL}/download/upload_file`, {
                method: 'POST',
                headers: {
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                },
                body: formData,
            });

            const data = await response.json();
            console.log('File upload response:', data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            // Handle different response structures
            let extractedData;
            if (data.data) {
                extractedData = data.data;
            } else {
                extractedData = data;
            }

            return {
                success: true,
                data: extractedData,
            };
        } catch (error) {
            console.error('File upload failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
            };
        }
    }

    // Upload post cover image
    async uploadPostCover(file: File, postId?: string): Promise<ApiResponse<{ file_url: string }>> {
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
            console.log('Cover upload response:', data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            console.log('Extracted data:', data.data);

            // Handle different response structures
            let extractedData;
            if (data.data && (data.data.file_url || data.data.cover_url)) {
                // Normalize the field name to file_url
                extractedData = {
                    ...data.data,
                    file_url: data.data.file_url || data.data.cover_url
                };
            } else if (data.file_url || data.cover_url) {
                extractedData = {
                    ...data,
                    file_url: data.file_url || data.cover_url
                };
            } else {
                console.error('Unexpected response structure:', data);
                throw new Error('Invalid response structure: missing file_url or cover_url');
            }

            return {
                success: true,
                data: extractedData,
            };
        } catch (error) {
            console.error('Cover upload failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Cover upload failed',
            };
        }
    }

    // Upload post content image
    async uploadPostImage(file: File): Promise<ApiResponse<{ file_url: string }>> {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`${this.baseURL}/post/upload_post_image`, {
                method: 'POST',
                headers: this.getUploadHeaders(),
                body: formData,
            });

            const data = await response.json();
            console.log('Post image upload response:', data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            // Handle different response structures
            let extractedData;
            if (data.data && data.data.file_url) {
                extractedData = data.data;
            } else if (data.file_url) {
                extractedData = data;
            } else {
                console.error('Unexpected response structure:', data);
                throw new Error('Invalid response structure: missing file_url');
            }

            return {
                success: true,
                data: extractedData,
            };
        } catch (error) {
            console.error('Image upload failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Image upload failed',
            };
        }
    }
}
