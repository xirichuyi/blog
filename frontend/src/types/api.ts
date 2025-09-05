// API Response Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    total?: number;
    page?: number;
    page_size?: number;
}

export interface ApiError {
    code: string;
    message: string;
    details?: any;
}

export interface PaginationParams {
    page?: number;
    page_size?: number;
    limit?: number;
    offset?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    page_size: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface UploadResponse {
    file_url: string;
    file_name: string;
    file_size: number;
}

export interface DashboardStats {
    total_posts: number;
    total_categories: number;
    total_tags: number;
    total_music: number;
    recent_posts: any[];
    system_info?: {
        uptime: string;
        memory_usage: string;
        disk_usage: string;
    };
}

export interface MusicTrack {
    id: number;
    title: string;
    artist: string;
    album?: string;
    genre?: string;
    duration?: number;
    file_url: string;
    cover_url?: string;
    created_at: string;
    updated_at: string;
}

export interface MusicUploadData {
    title: string;
    artist: string;
    album?: string;
    genre?: string;
    music_file: File;
    cover_file?: File;
}