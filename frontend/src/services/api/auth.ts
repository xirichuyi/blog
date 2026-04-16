// Authentication API service

import { BaseApiService } from './base';
import type { LoginCredentials, LoginResponse, ApiResponse } from '../types';

export class AuthApiService extends BaseApiService {
    async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
        // Store token so subsequent requests include it in headers
        localStorage.setItem('admin_token', credentials.token);

        const verified = await this.verifyToken();
        if (!verified.success || !verified.data?.valid) {
            localStorage.removeItem('admin_token');
            return {
                success: false,
                error: 'Invalid token',
            };
        }

        return {
            success: true,
            data: {
                success: true,
                token: credentials.token,
                user: {
                    id: '1',
                    username: 'admin',
                    role: 'admin' as const,
                    lastLogin: new Date().toISOString(),
                },
            },
        };
    }

    async verifyToken(): Promise<ApiResponse<{ valid: boolean }>> {
        try {
            const response = await this.request<{ code: number }>('/health');
            return { success: true, data: { valid: response.success } };
        } catch {
            return { success: false, error: 'Token verification failed' };
        }
    }
}
