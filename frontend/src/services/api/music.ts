// Music API service

import { BaseApiService } from './base';
import type { MusicTrack, ApiResponse } from '../types';

interface BackendMusic {
    id: number;
    music_name: string;
    music_author: string;
    music_url: string;
    music_cover_url?: string;
    status: number;
    created_at: string;
    updated_at: string;
}

export class MusicApiService extends BaseApiService {
    // Music Management APIs
    async getMusicTracks(params?: { search?: string; genre?: string; page?: number; page_size?: number }): Promise<ApiResponse<MusicTrack[]>> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

            const response = await fetch(`${this.baseURL}/music/list?${queryParams}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.code === 200) {
                // Convert backend Music model to frontend MusicTrack model
                const tracks: MusicTrack[] = result.data.map((music: BackendMusic) => ({
                    id: music.id.toString(),
                    title: music.music_name,
                    artist: music.music_author,
                    album: undefined, // Backend doesn't have album field yet
                    genre: undefined, // Backend doesn't have genre field yet
                    duration: 0, // Will be extracted from file metadata
                    file_url: music.music_url,
                    cover_url: music.music_cover_url,
                    upload_date: music.created_at,
                    file_size: 0, // Will be calculated
                    status: music.status === 1 ? 'active' : 'inactive',
                }));

                // Apply client-side filters for search and genre (until backend supports them)
                let filteredTracks = tracks;
                if (params?.search) {
                    const searchLower = params.search.toLowerCase();
                    filteredTracks = filteredTracks.filter(track =>
                        track.title.toLowerCase().includes(searchLower) ||
                        track.artist.toLowerCase().includes(searchLower) ||
                        track.album?.toLowerCase().includes(searchLower)
                    );
                }

                if (params?.genre) {
                    filteredTracks = filteredTracks.filter(track => track.genre === params.genre);
                }

                return { success: true, data: filteredTracks };
            } else {
                throw new Error(result.message || 'Failed to fetch music tracks');
            }
        } catch (error) {
            console.error('Failed to fetch music tracks:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch music tracks',
            };
        }
    }

    async uploadMusic(formData: FormData): Promise<ApiResponse<MusicTrack>> {
        try {
            // Extract form data
            const title = formData.get('title') as string;
            const artist = formData.get('artist') as string;
            const musicFile = formData.get('music') as File;
            const coverFile = formData.get('cover') as File;

            console.log('Uploading music:', { title, artist, musicFile: musicFile?.name, coverFile: coverFile?.name });

            if (!title || !artist || !musicFile) {
                throw new Error('Title, artist, and music file are required');
            }

            // Step 1: Upload music file
            const musicUploadFormData = new FormData();
            musicUploadFormData.append('file', musicFile);

            console.log('Music upload FormData:', musicUploadFormData);

            const musicUploadResponse = await fetch(`${this.baseURL}/music/upload_music`, {
                method: 'POST',
                headers: this.getUploadHeaders(),
                body: musicUploadFormData,
            });

            if (!musicUploadResponse.ok) {
                const errorText = await musicUploadResponse.text();
                console.error('Music upload failed:', musicUploadResponse.status, errorText);
                throw new Error(`Music upload failed: ${musicUploadResponse.status} - ${errorText}`);
            }

            const musicUploadResult = await musicUploadResponse.json();
            if (!musicUploadResult.success) {
                throw new Error(musicUploadResult.message || 'Music upload failed');
            }

            let coverUrl: string | undefined;

            // Step 2: Upload cover file if provided
            if (coverFile) {
                const coverUploadFormData = new FormData();
                coverUploadFormData.append('file', coverFile);

                const coverUploadResponse = await fetch(`${this.baseURL}/music/upload_cover`, {
                    method: 'POST',
                    headers: this.getUploadHeaders(),
                    body: coverUploadFormData,
                });

                if (coverUploadResponse.ok) {
                    const coverUploadResult = await coverUploadResponse.json();
                    if (coverUploadResult.success) {
                        coverUrl = coverUploadResult.data.file_url;
                    }
                }
            }

            // Step 3: Create music record
            const createMusicData = {
                music_name: title,
                music_author: artist,
                music_url: musicUploadResult.data.file_url,
                music_cover_url: coverUrl,
                status: 1, // Published
            };

            const createResponse = await fetch(`${this.baseURL}/music/create`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(createMusicData),
            });

            if (!createResponse.ok) {
                throw new Error(`Create music failed: ${createResponse.status}`);
            }

            const createResult = await createResponse.json();
            if (!createResult.success) {
                throw new Error(createResult.message || 'Create music failed');
            }

            // Convert to frontend format
            const music = createResult.data;
            const newTrack: MusicTrack = {
                id: music.id.toString(),
                title: music.music_name,
                artist: music.music_author,
                album: undefined,
                genre: undefined,
                duration: 0, // Will be extracted later
                file_url: music.music_url,
                cover_url: music.music_cover_url,
                upload_date: music.created_at,
                file_size: musicFile.size / (1024 * 1024), // Convert to MB
                status: music.status === 1 ? 'active' : 'inactive',
            };

            return { success: true, data: newTrack };
        } catch (error) {
            console.error('Music upload failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
            };
        }
    }

    async deleteMusic(id: string): Promise<ApiResponse<void>> {
        try {
            const response = await fetch(`${this.baseURL}/music/delete/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Delete music failed: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return { success: true };
            } else {
                throw new Error(result.message || 'Delete music failed');
            }
        } catch (error) {
            console.error('Delete music failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete music track',
            };
        }
    }

    async bulkDeleteMusic(ids: string[]): Promise<ApiResponse<void>> {
        try {
            // Delete each music track individually since backend doesn't have bulk delete
            const deletePromises = ids.map(id => this.deleteMusic(id));
            const results = await Promise.allSettled(deletePromises);

            const failedDeletes = results.filter(result =>
                result.status === 'rejected' ||
                (result.status === 'fulfilled' && !result.value.success)
            );

            if (failedDeletes.length > 0) {
                return {
                    success: false,
                    error: `Failed to delete ${failedDeletes.length} out of ${ids.length} music tracks`
                };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete music tracks',
            };
        }
    }
}
