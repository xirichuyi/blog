// Resource Management API service

import { BaseApiService } from './base';
import type { ApiResponse } from '../types';

export interface UsageRef {
  ref_type: string;
  ref_id: number;
  ref_title: string;
}

export interface ResourceUsage {
  is_used: boolean;
  used_by: UsageRef[];
}

export interface StaticResource {
  path: string;
  full_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  usage: ResourceUsage;
}

export interface TypeStats {
  count: number;
  size: number;
}

export interface ResourceStats {
  total_count: number;
  total_size: number;
  by_type: Record<string, TypeStats>;
  unused_count: number;
  duplicate_count: number;
}

export interface OptimizeResult {
  converted: number;
  skipped: number;
  failed: number;
  original_size: number;
  optimized_size: number;
}

export class ResourceApiService extends BaseApiService {
  // List all resources
  async listResources(fileType?: string, used?: boolean): Promise<ApiResponse<StaticResource[]>> {
    const params = new URLSearchParams();
    if (fileType) params.append('file_type', fileType);
    if (used !== undefined) params.append('used', String(used));
    const queryString = params.toString();
    return this.request<StaticResource[]>(`/admin/resources${queryString ? `?${queryString}` : ''}`);
  }

  // Get resource statistics
  async getResourceStats(): Promise<ApiResponse<ResourceStats>> {
    return this.request<ResourceStats>('/admin/resources/stats');
  }

  // Delete a resource
  async deleteResource(path: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/resources/delete?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  }

  // Optimize all images (batch convert to WebP)
  async optimizeAllImages(): Promise<ApiResponse<OptimizeResult>> {
    return this.request<OptimizeResult>('/admin/resources/optimize', {
      method: 'POST',
    });
  }

  async cleanupUnused(): Promise<ApiResponse<{ total_unused: number; deleted: number; failed: number }>> {
    return this.request('/admin/resources/cleanup', {
      method: 'POST',
    });
  }
}
