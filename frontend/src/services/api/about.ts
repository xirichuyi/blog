// About API service

import { BaseApiService } from './base';
import type { ApiResponse } from '../types';

interface BackendAbout {
    id: number;
    title: string;
    subtitle: string;
    content: string;
    photo_url?: string;
    updated_at: string;
}

export class AboutApiService extends BaseApiService {
    // About APIs
    async getAbout(): Promise<ApiResponse<BackendAbout>> {
        const resp = await this.request<{ data: BackendAbout }>(`/about/get`);
        if (resp.success && resp.data) {
            const body = resp.data as unknown as { data: BackendAbout };
            return { success: true, data: body.data };
        }
        return resp as unknown as ApiResponse<BackendAbout>;
    }

    async updateAbout(payload: { title?: string; subtitle?: string; content?: string; photo_url?: string; }): Promise<ApiResponse<BackendAbout>> {
        const resp = await this.request<{ data: BackendAbout }>(`/about/update`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        if (resp.success && resp.data) {
            const body = resp.data as unknown as { data: BackendAbout };
            return { success: true, data: body.data };
        }
        return resp as unknown as ApiResponse<BackendAbout>;
    }
}
