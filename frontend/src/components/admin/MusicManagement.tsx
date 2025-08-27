// Music Management Component

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { formatFileSize } from '../../utils/musicMetadata';
import type { MusicTrack } from '../../types';
import MusicPlayer from '../music/MusicPlayer';
import AdminLayout from './AdminLayout';
import './MusicManagement.css';



interface MusicFilters {
  search: string;
  genre: string;
}

const MusicManagement: React.FC = () => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MusicFilters>({
    search: '',
    genre: '',
  });
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tracks, filters]);

  const loadTracks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getMusicTracks({
        search: filters.search,
        genre: filters.genre,
      });

      if (response.success && response.data) {
        setTracks(response.data);
      } else {
        throw new Error(response.error || 'Failed to load music tracks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load music tracks');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tracks];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(track =>
        track.title.toLowerCase().includes(searchLower) ||
        track.artist.toLowerCase().includes(searchLower) ||
        track.album?.toLowerCase().includes(searchLower)
      );
    }

    // Genre filter
    if (filters.genre) {
      filtered = filtered.filter(track => track.genre === filters.genre);
    }

    setFilteredTracks(filtered);
  };

  const handleUploadMusic = () => {
    navigate('/admin/music/upload');
  };

  const handlePlayTrack = (trackId: string) => {
    const track = filteredTracks.find(t => t.id === trackId);
    if (!track) return;

    if (currentPlaying === trackId && isPlaying) {
      setIsPlaying(false);
    } else if (currentPlaying === trackId && !isPlaying) {
      setIsPlaying(true);
    } else {
      setCurrentPlaying(trackId);
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % filteredTracks.length;
    const nextTrack = filteredTracks[nextIndex];
    setCurrentPlaying(nextTrack.id);
    setCurrentTrack(nextTrack);
    setIsPlaying(true);
  };

  const handlePreviousTrack = () => {
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? filteredTracks.length - 1 : currentIndex - 1;
    const prevTrack = filteredTracks[prevIndex];
    setCurrentPlaying(prevTrack.id);
    setCurrentTrack(prevTrack);
    setIsPlaying(true);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (confirm('Are you sure you want to delete this track?')) {
      try {
        const response = await apiService.deleteMusic(trackId);
        if (response.success) {
          setTracks(tracks.filter(track => track.id !== trackId));
          // Remove from selected if it was selected
          const newSelected = new Set(selectedTracks);
          newSelected.delete(trackId);
          setSelectedTracks(newSelected);

          // Show success notification
          showNotification({
            type: 'success',
            title: 'Track Deleted',
            message: 'The music track has been deleted successfully.',
          });
        } else {
          throw new Error(response.error || 'Failed to delete track');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete track');
      }
    }
  };

  const handleSelectTrack = (trackId: string) => {
    const newSelected = new Set(selectedTracks);
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      newSelected.add(trackId);
    }
    setSelectedTracks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTracks.size === filteredTracks.length) {
      setSelectedTracks(new Set());
    } else {
      setSelectedTracks(new Set(filteredTracks.map(track => track.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTracks.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedTracks.size} tracks?`)) {
      try {
        const response = await apiService.bulkDeleteMusic(Array.from(selectedTracks));
        if (response.success) {
          const deletedCount = selectedTracks.size;
          setTracks(tracks.filter(track => !selectedTracks.has(track.id)));
          setSelectedTracks(new Set());

          // Show success notification
          showNotification({
            type: 'success',
            title: 'Tracks Deleted',
            message: `${deletedCount} track${deletedCount > 1 ? 's' : ''} deleted successfully.`,
          });
        } else {
          throw new Error(response.error || 'Failed to delete tracks');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete tracks');
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (sizeInMB: number) => {
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Music Management">
        <div className="music-management-loading">
          <md-circular-progress indeterminate></md-circular-progress>
          <p className="md-typescale-body-medium">Loading music tracks...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Music Management">
        <div className="music-management-error">
          <md-icon class="error-icon">error</md-icon>
          <h2 className="md-typescale-headline-small">Error Loading Music</h2>
          <p className="md-typescale-body-medium">{error}</p>
          <md-filled-button onClick={loadTracks}>
            <md-icon slot="icon">refresh</md-icon>
            Retry
          </md-filled-button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Music Management">
      <div className="music-management">
        {/* Header Actions */}
        <div className="music-header">
          <div className="music-header-title">
            <h1 className="md-typescale-display-small">Music Library</h1>
            <p className="md-typescale-body-large">
              Manage your music collection and uploads
            </p>
          </div>
          <div className="music-header-actions">
            <md-filled-button onClick={handleUploadMusic}>
              <md-icon slot="icon">upload</md-icon>
              Upload Music
            </md-filled-button>
          </div>
        </div>

        {/* Music Player */}
        {currentTrack && (
          <div className="music-player-section">
            <MusicPlayer
              track={currentTrack}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onNext={handleNextTrack}
              onPrevious={handlePreviousTrack}
            />
          </div>
        )}

        {/* Filters */}
        <div className="music-filters">
          <md-outlined-text-field
            label="Search music..."
            value={filters.search}
            onInput={(e: any) => setFilters({ ...filters, search: e.target.value })}
            class="search-field"
          >
            <md-icon slot="leading-icon">search</md-icon>
          </md-outlined-text-field>

          <md-outlined-select
            label="Genre"
            value={filters.genre}
            onInput={(e: any) => setFilters({ ...filters, genre: e.target.value })}
          >
            <md-select-option value="">All Genres</md-select-option>
            <md-select-option value="Ambient">Ambient</md-select-option>
            <md-select-option value="Electronic">Electronic</md-select-option>
            <md-select-option value="Lo-Fi">Lo-Fi</md-select-option>
            <md-select-option value="Classical">Classical</md-select-option>
          </md-outlined-select>
        </div>

        {/* Bulk Actions */}
        {selectedTracks.size > 0 && (
          <div className="bulk-actions">
            <span className="md-typescale-body-medium">
              {selectedTracks.size} track{selectedTracks.size > 1 ? 's' : ''} selected
            </span>
            <md-text-button onClick={handleBulkDelete}>
              <md-icon slot="icon">delete</md-icon>
              Delete Selected
            </md-text-button>
          </div>
        )}

        {/* Music Grid */}
        <div className="music-grid">
          {filteredTracks.map((track) => (
            <md-elevated-card key={track.id} class={`music-card ${selectedTracks.has(track.id) ? 'selected' : ''}`}>
              <div className="music-card-content">
                {/* Selection Checkbox */}
                <div className="card-selection">
                  <md-checkbox
                    checked={selectedTracks.has(track.id)}
                    onChange={() => handleSelectTrack(track.id)}
                  ></md-checkbox>
                </div>

                {/* Cover Art */}
                <div className="music-cover">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt={track.title} />
                  ) : (
                    <div className="default-cover">
                      <md-icon>music_note</md-icon>
                    </div>
                  )}
                  
                  {/* Play Button Overlay */}
                  <div className="play-overlay">
                    <md-icon-button 
                      class="play-button"
                      onClick={() => handlePlayTrack(track.id)}
                    >
                      <md-icon>
                        {currentPlaying === track.id && isPlaying ? 'pause' : 'play_arrow'}
                      </md-icon>
                    </md-icon-button>
                  </div>
                </div>

                {/* Track Info */}
                <div className="music-info">
                  <h3 className="track-title md-typescale-title-medium">{track.title}</h3>
                  <p className="track-artist md-typescale-body-medium">{track.artist}</p>
                  {track.album && (
                    <p className="track-album md-typescale-body-small">{track.album}</p>
                  )}
                  
                  <div className="track-meta">
                    <span className="duration">{formatDuration(track.duration)}</span>
                    {track.genre && (
                      <md-assist-chip class="genre-chip">{track.genre}</md-assist-chip>
                    )}
                  </div>
                  
                  <div className="track-details">
                    <span className="file-size md-typescale-body-small">
                      {formatFileSize(track.fileSize)}
                    </span>
                    <span className="upload-date md-typescale-body-small">
                      {formatDate(track.uploadDate)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="music-actions">
                  <md-icon-button onClick={() => handleDeleteTrack(track.id)}>
                    <md-icon>delete</md-icon>
                  </md-icon-button>
                </div>
              </div>
            </md-elevated-card>
          ))}
        </div>

        {filteredTracks.length === 0 && (
          <div className="empty-state">
            <md-icon class="empty-icon">library_music</md-icon>
            <h3 className="md-typescale-headline-small">No music found</h3>
            <p className="md-typescale-body-medium">
              {filters.search || filters.genre
                ? 'Try adjusting your filters'
                : 'Upload your first music track to get started'}
            </p>
            {!filters.search && !filters.genre && (
              <md-filled-button onClick={handleUploadMusic}>
                <md-icon slot="icon">upload</md-icon>
                Upload Music
              </md-filled-button>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default MusicManagement;
