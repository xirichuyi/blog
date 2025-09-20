// Authentication API service

import { BaseApiService } from './base';
import type { LoginCredentials, LoginResponse, ApiResponse } from '../types';

export class AuthApiService extends BaseApiService {
    // Authentication APIs
    async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
        try {
            // For this backend, we use a fixed admin token instead of username/password login
            // Check if credentials match expected admin credentials
            const expectedUsername = 'admin';
            const expectedPassword = 'dev-admin-token-not-for-production'; // This should match the backend's admin token

            if (credentials.username !== expectedUsername || credentials.password !== expectedPassword) {
                return {
                    success: false,
                    error: 'Invalid credentials',
                };
            }

            // Return success with the admin token
            const adminToken = 'dev-admin-token-not-for-production'; // This should match the backend's admin token
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
                    token: adminToken,
                    user: mockUser,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Login failed',
            };
        }
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
