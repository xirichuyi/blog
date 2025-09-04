import React, { useState, useRef, useCallback, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import './CoverUpload.css';

interface CoverUploadProps {
  value?: string; // Current cover URL
  onChange?: (url: string | null) => void; // Callback when cover changes
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  maxSize?: number; // in MB, default 10
  accept?: string; // default 'image/*'
  supportPaste?: boolean; // default true
  supportDragDrop?: boolean; // default true
}

const CoverUpload: React.FC<CoverUploadProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Upload Cover Image',
  maxSize = 10,
  accept = 'image/*',
  supportPaste = true,
  supportDragDrop = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useNotification();

  // Handle paste events
  useEffect(() => {
    if (!supportPaste || disabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle paste if the container is focused or contains the active element
      if (!containerRef.current?.contains(document.activeElement)) return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // Check for files in clipboard
      const files = Array.from(clipboardData.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleFileUpload(imageFiles[0]);
        return;
      }

      // Check for image data in clipboard (e.g., from screenshots)
      const items = Array.from(clipboardData.items);
      const imageItems = items.filter(item => item.type.startsWith('image/'));

      if (imageItems.length > 0) {
        e.preventDefault();
        const file = imageItems[0].getAsFile();
        if (file) {
          await handleFileUpload(file);
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [supportPaste, disabled]);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid image file (JPG, PNG, WebP, GIF)';
    }

    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Image size must be less than ${maxSize}MB`;
    }

    return null;
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file || disabled) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      showNotification({
        type: 'error',
        title: 'Invalid File',
        message: validationError,
      });
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const result = await apiService.uploadPostCover(file);

      if (result.success && result.data?.file_url) {
        const fullCoverUrl = apiService.getImageUrl(result.data.file_url);
        // Add timestamp to avoid browser cache issues
        const cacheBustedUrl = `${fullCoverUrl}?t=${Date.now()}`;

        onChange?.(cacheBustedUrl);

        showNotification({
          type: 'success',
          title: 'Cover Uploaded',
          message: 'Cover image has been uploaded successfully',
        });
      } else {
        throw new Error(result.error || 'Failed to upload cover');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload cover image';
      setError(errorMessage);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && supportDragDrop) {
      setIsDragOver(true);
    }
  }, [disabled, supportDragDrop]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!disabled && supportDragDrop) {
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        showNotification({
          type: 'warning',
          title: 'No Images Found',
          message: 'Please drop image files only.',
        });
        return;
      }

      await handleFileUpload(imageFiles[0]);
    }
  }, [disabled, supportDragDrop]);

  // Handle input change
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  // Open file dialog
  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Remove cover
  const removeCover = () => {
    onChange?.(null);
    setError(null);
  };

  return (
    <div className={`cover-upload ${className}`} ref={containerRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {value ? (
        <div className="cover-preview">
          <img src={value} alt="Cover preview" className="cover-image" />
          <div className="cover-overlay">
            <md-icon-button onClick={openFileDialog} title="Change cover">
              <md-icon>edit</md-icon>
            </md-icon-button>
            <md-icon-button onClick={removeCover} title="Remove cover">
              <md-icon>delete</md-icon>
            </md-icon-button>
          </div>
          {isUploading && (
            <div className="upload-progress-overlay">
              <md-circular-progress indeterminate></md-circular-progress>
              <span>Uploading...</span>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`cover-upload-zone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
        >
          {isUploading ? (
            <div className="upload-progress-content">
              <md-circular-progress indeterminate></md-circular-progress>
              <p className="md-typescale-body-medium">Uploading cover...</p>
            </div>
          ) : (
            <div className="upload-content">
              <md-icon class="upload-icon">cloud_upload</md-icon>
              <h3 className="md-typescale-title-medium">{placeholder}</h3>
              <p className="md-typescale-body-medium">
                {supportDragDrop ? 'Drag & drop, click to browse' : 'Click to select'}
                {supportPaste ? ', or paste from clipboard' : ''}
              </p>
              <p className="md-typescale-body-small">
                Images only • Max {maxSize}MB • Supports JPG, PNG, WebP, GIF
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="upload-error">
          <md-icon>error</md-icon>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default CoverUpload;
