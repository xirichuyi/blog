// Health Check API service

import { BaseApiService } from './base';
import type { DashboardStats, ApiResponse } from '../types';

export class HealthApiService extends BaseApiService {
    // Health Check
    async healthCheck(): Promise<ApiResponse<{ status: string }>> {
        return this.request('/health');
    }

    // Detailed Health Check
    async detailedHealthCheck(): Promise<ApiResponse<Record<string, unknown>>> {
        return this.request('/health/detailed');
    }

    // Dashboard Stats - uses real backend API
    async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
        return this.request<DashboardStats>('/admin/dashboard/stats');
    }
}
