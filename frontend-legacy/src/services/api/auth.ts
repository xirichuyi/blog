// Authentication API service

import { BaseApiService } from './base';
import type { LoginCredentials, LoginResponse, ApiResponse } from '../types';

export class AuthApiService extends BaseApiService {
    // Authentication APIs
    async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
        // Directly use the provided token
        const mockUser = {
            id: '1',
            username: 'admin',
            role: 'admin' as const,
            lastLogin: new Date().toISOString(),
        };

        return {
            success: true,
            data: {
                success: true,
                token: credentials.token,
                user: mockUser,
            },
        };
    }

    async verifyToken(): Promise<ApiResponse<{ valid: boolean }>> {
        try {
            const response = await this.request('/health');
            return {
                success: true,
                data: { valid: response.success }
            };
        } catch {
            return {
                success: true,
                data: { valid: false }
            };
        }
    }
}
