// Music Upload Component

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import type { MusicUploadData } from '../../types';
import AdminLayout from './AdminLayout';
import './MusicUpload.css';

const MusicUpload: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
  });
  
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMusicFileChange = (file: File | null) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid audio file (MP3, WAV, OGG, MP4)');
        return;
      }
      
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 50MB');
        return;
      }
      
      setMusicFile(file);
      setError(null);
      
      // Auto-fill title if empty
      if (!formData.title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setFormData(prev => ({ ...prev, title: fileName }));
      }
    }
  };

  const handleCoverFileChange = (file: File | null) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, WebP)');
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('Cover image size must be less than 5MB');
        return;
      }
      
      setCoverFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'music' | 'cover') => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (type === 'music') {
        handleMusicFileChange(files[0]);
      } else {
        handleCoverFileChange(files[0]);
      }
    }
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);
      
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      
      if (!formData.artist.trim()) {
        throw new Error('Artist is required');
      }
      
      if (!musicFile) {
        throw new Error('Please select a music file');
      }
      
      // Create form data
      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title.trim());
      uploadFormData.append('artist', formData.artist.trim());
      uploadFormData.append('album', formData.album.trim());
      uploadFormData.append('genre', formData.genre);
      uploadFormData.append('music', musicFile);
      
      if (coverFile) {
        uploadFormData.append('cover', coverFile);
      }
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      const response = await apiService.uploadMusic(uploadFormData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.success) {
        // Show success notification
        showNotification({
          type: 'success',
          title: 'Music Uploaded!',
          message: `"${formData.title}" has been uploaded successfully.`,
        });

        // Redirect to music management
        setTimeout(() => {
          navigate('/admin/music');
        }, 1000);
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
      navigate('/admin/music');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout title="Upload Music">
      <div className="music-upload">
        {error && (
          <div className="upload-error">
            <md-icon>error</md-icon>
            <span>{error}</span>
          </div>
        )}

        {/* Header */}
        <div className="upload-header">
          <div className="upload-title">
            <h1 className="md-typescale-display-small">Upload Music</h1>
            <p className="md-typescale-body-large">
              Add new music tracks to your collection
            </p>
          </div>
          
          <div className="upload-actions">
            <md-text-button onClick={handleCancel}>
              Cancel
            </md-text-button>
            
            <md-filled-button 
              onClick={handleUpload}
              disabled={isUploading || !musicFile}
            >
              {isUploading ? (
                <>
                  <md-circular-progress 
                    indeterminate 
                    slot="icon"
                    style={{ width: '18px', height: '18px' }}
                  ></md-circular-progress>
                  Uploading...
                </>
              ) : (
                <>
                  <md-icon slot="icon">upload</md-icon>
                  Upload Music
                </>
              )}
            </md-filled-button>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="upload-progress">
            <div className="progress-info">
              <span className="md-typescale-body-medium">Uploading...</span>
              <span className="md-typescale-body-medium">{uploadProgress}%</span>
            </div>
            <md-linear-progress value={uploadProgress / 100}></md-linear-progress>
          </div>
        )}

        {/* Form */}
        <div className="upload-form">
          {/* File Upload Section */}
          <div className="form-section">
            <h2 className="md-typescale-headline-small">Files</h2>
            
            {/* Music File Upload */}
            <div className="file-upload-section">
              <label className="md-typescale-title-medium">Music File *</label>
              <div 
                className={`file-drop-zone ${dragOver ? 'drag-over' : ''} ${musicFile ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'music')}
              >
                {musicFile ? (
                  <div className="file-info">
                    <md-icon class="file-icon">audio_file</md-icon>
                    <div className="file-details">
                      <span className="file-name md-typescale-body-large">{musicFile.name}</span>
                      <span className="file-size md-typescale-body-medium">{formatFileSize(musicFile.size)}</span>
                    </div>
                    <md-icon-button onClick={() => setMusicFile(null)}>
                      <md-icon>close</md-icon>
                    </md-icon-button>
                  </div>
                ) : (
                  <div className="drop-zone-content">
                    <md-icon class="upload-icon">cloud_upload</md-icon>
                    <p className="md-typescale-body-large">Drag and drop your music file here</p>
                    <p className="md-typescale-body-medium">or</p>
                    <md-outlined-button>
                      <md-icon slot="icon">folder_open</md-icon>
                      Browse Files
                    </md-outlined-button>
                    <p className="md-typescale-body-small">Supported formats: MP3, WAV, OGG, MP4 (Max 50MB)</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleMusicFileChange(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="file-upload-section">
              <label className="md-typescale-title-medium">Cover Image (Optional)</label>
              <div 
                className={`file-drop-zone cover-zone ${coverFile ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'cover')}
              >
                {coverFile ? (
                  <div className="file-info">
                    <md-icon class="file-icon">image</md-icon>
                    <div className="file-details">
                      <span className="file-name md-typescale-body-large">{coverFile.name}</span>
                      <span className="file-size md-typescale-body-medium">{formatFileSize(coverFile.size)}</span>
                    </div>
                    <md-icon-button onClick={() => setCoverFile(null)}>
                      <md-icon>close</md-icon>
                    </md-icon-button>
                  </div>
                ) : (
                  <div className="drop-zone-content">
                    <md-icon class="upload-icon">image</md-icon>
                    <p className="md-typescale-body-medium">Add cover image</p>
                    <md-text-button>
                      <md-icon slot="icon">add_photo_alternate</md-icon>
                      Browse Images
                    </md-text-button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverFileChange(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="form-section">
            <h2 className="md-typescale-headline-small">Track Information</h2>
            
            <div className="metadata-grid">
              <md-outlined-text-field
                label="Title *"
                value={formData.title}
                onInput={(e: any) => handleInputChange('title', e.target.value)}
                required
                class="metadata-field"
              ></md-outlined-text-field>
              
              <md-outlined-text-field
                label="Artist *"
                value={formData.artist}
                onInput={(e: any) => handleInputChange('artist', e.target.value)}
                required
                class="metadata-field"
              ></md-outlined-text-field>
              
              <md-outlined-text-field
                label="Album"
                value={formData.album}
                onInput={(e: any) => handleInputChange('album', e.target.value)}
                class="metadata-field"
              ></md-outlined-text-field>
              
              <md-outlined-select
                label="Genre"
                value={formData.genre}
                onInput={(e: any) => handleInputChange('genre', e.target.value)}
                class="metadata-field"
              >
                <md-select-option value="">Select Genre</md-select-option>
                <md-select-option value="Ambient">Ambient</md-select-option>
                <md-select-option value="Electronic">Electronic</md-select-option>
                <md-select-option value="Lo-Fi">Lo-Fi</md-select-option>
                <md-select-option value="Classical">Classical</md-select-option>
                <md-select-option value="Jazz">Jazz</md-select-option>
                <md-select-option value="Rock">Rock</md-select-option>
                <md-select-option value="Pop">Pop</md-select-option>
                <md-select-option value="Hip-Hop">Hip-Hop</md-select-option>
              </md-outlined-select>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MusicUpload;
