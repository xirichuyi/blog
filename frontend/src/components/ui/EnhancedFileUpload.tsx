import React, { useState, useRef, useCallback, useEffect } from 'react';
import { apiService } from '../../services/api';
import './EnhancedFileUpload.css';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

interface EnhancedFileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  maxFiles?: number;
  onUploadComplete?: (files: { url: string; name: string }[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  dragAndDrop?: boolean;
  showPreview?: boolean;
  // New props for enhanced functionality
  mode?: 'default' | 'cover' | 'inline'; // Different upload modes
  existingUrl?: string; // For editing existing files
  onUrlChange?: (url: string | null) => void; // Callback for URL changes
  placeholder?: string; // Custom placeholder text
  supportPaste?: boolean; // Enable paste functionality
}

const EnhancedFileUpload: React.FC<EnhancedFileUploadProps> = ({
  accept = 'image/*',
  multiple = false,
  maxSize = 10, // 10MB default
  maxFiles = 5,
  onUploadComplete,
  onUploadError,
  className = '',
  disabled = false,
  dragAndDrop = true,
  showPreview = true,
  mode = 'default',
  existingUrl,
  onUrlChange,
  placeholder,
  supportPaste = true
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(existingUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate unique ID for files
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Update current URL when existingUrl changes
  useEffect(() => {
    setCurrentUrl(existingUrl || null);
  }, [existingUrl]);

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
        handleFileSelect(imageFiles);
        return;
      }

      // Check for image data in clipboard (e.g., from screenshots)
      const items = Array.from(clipboardData.items);
      const imageItems = items.filter(item => item.type.startsWith('image/'));

      if (imageItems.length > 0) {
        e.preventDefault();
        const imageFiles = await Promise.all(
          imageItems.map(item => item.getAsFile()).filter(Boolean)
        );
        handleFileSelect(imageFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [supportPaste, disabled]);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }

    // Check file type
    if (accept !== '*' && !file.type.match(accept.replace(/\*/g, '.*'))) {
      return `File type not supported. Accepted: ${accept}`;
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    const newFiles: UploadFile[] = [];
    const errors: string[] = [];

    // Check total file count
    if (files.length + selectedFiles.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      onUploadError?.(errors.join(', '));
      return;
    }

    Array.from(selectedFiles).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        newFiles.push({
          id: generateId(),
          file,
          progress: 0,
          status: 'pending'
        });
      }
    });

    if (errors.length > 0) {
      onUploadError?.(errors.join(', '));
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      // Start uploading immediately
      newFiles.forEach(uploadFile);
    }
  }, [files.length, maxFiles, maxSize, accept, disabled, onUploadError]);

  // Upload single file
  const uploadFile = async (uploadFile: UploadFile) => {
    setFiles(prev => prev.map(f =>
      f.id === uploadFile.id
        ? { ...f, status: 'uploading', progress: 0 }
        : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id && f.progress < 90
            ? { ...f, progress: f.progress + Math.random() * 20 }
            : f
        ));
      }, 200);

      const response = await apiService.uploadFile(uploadFile.file, 'image');

      clearInterval(progressInterval);

      if (response.success && response.data) {
        const uploadedUrl = response.data.url || response.data.file_url;

        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? {
              ...f,
              status: 'success',
              progress: 100,
              url: uploadedUrl
            }
            : f
        ));

        // For cover mode, update current URL immediately
        if (mode === 'cover' && !multiple) {
          const fullUrl = uploadedUrl.startsWith('http') ? uploadedUrl : apiService.getImageUrl(uploadedUrl);
          setCurrentUrl(fullUrl);
          onUrlChange?.(fullUrl);
        }

        // Check if all files are uploaded
        const updatedFiles = files.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'success' as const, url: uploadedUrl }
            : f
        );

        const allSuccess = updatedFiles.every(f => f.status === 'success');
        if (allSuccess && onUploadComplete) {
          const completedFiles = updatedFiles
            .filter(f => f.url)
            .map(f => ({ url: f.url!, name: f.file.name }));
          onUploadComplete(completedFiles);
        }
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));

      onUploadError?.(errorMessage);
    }
  };

  // Remove file
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Remove current URL (for cover mode)
  const removeCurrentUrl = () => {
    setCurrentUrl(null);
    onUrlChange?.(null);
    setFiles([]); // Clear any pending uploads
  };

  // Retry upload
  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFile(file);
    }
  };

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && dragAndDrop) {
      setIsDragOver(true);
    }
  }, [disabled, dragAndDrop]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!disabled && dragAndDrop) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [disabled, dragAndDrop, handleFileSelect]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  // Open file dialog
  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Get file preview
  const getFilePreview = (file: File): string | null => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render cover mode
  const renderCoverMode = () => (
    <div className={`enhanced-file-upload cover-mode ${className}`} ref={containerRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {currentUrl ? (
        <div className="cover-preview">
          <img src={currentUrl} alt="Cover preview" className="cover-image" />
          <div className="cover-overlay">
            <md-icon-button onClick={openFileDialog} title="Change cover">
              <md-icon>edit</md-icon>
            </md-icon-button>
            <md-icon-button onClick={removeCurrentUrl} title="Remove cover">
              <md-icon>delete</md-icon>
            </md-icon-button>
          </div>
          {files.some(f => f.status === 'uploading') && (
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
          {files.some(f => f.status === 'uploading') ? (
            <div className="upload-progress-content">
              <md-circular-progress indeterminate></md-circular-progress>
              <p className="md-typescale-body-medium">Uploading cover...</p>
            </div>
          ) : (
            <div className="upload-content">
              <md-icon class="upload-icon">cloud_upload</md-icon>
              <h3 className="md-typescale-title-medium">
                {placeholder || 'Upload Cover Image'}
              </h3>
              <p className="md-typescale-body-medium">
                {dragAndDrop ? 'Drag & drop, click to browse' : 'Click to select'}
                {supportPaste ? ', or paste from clipboard' : ''}
              </p>
              <p className="md-typescale-body-small">
                {accept === 'image/*' ? 'Images only' : `Accepted: ${accept}`} • Max {maxSize}MB
              </p>
            </div>
          )}
        </div>
      )}

      {files.some(f => f.status === 'error') && (
        <div className="upload-error">
          <md-icon>error</md-icon>
          <span>{files.find(f => f.status === 'error')?.error}</span>
        </div>
      )}
    </div>
  );

  // Render default mode
  const renderDefaultMode = () => (
    <div className={`enhanced-file-upload ${className}`} ref={containerRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      <div
        className={`upload-dropzone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
      >
        <div className="dropzone-content">
          <md-icon class="upload-icon">cloud_upload</md-icon>
          <h3 className="md-typescale-title-medium">
            {placeholder || (dragAndDrop ? 'Drop files here or click to browse' : 'Click to select files')}
          </h3>
          <p className="md-typescale-body-medium upload-info">
            {accept === 'image/*' ? 'Images only' : `Accepted: ${accept}`} •
            Max {maxSize}MB •
            {multiple ? `Up to ${maxFiles} files` : 'Single file'}
            {supportPaste ? ' • Paste supported' : ''}
          </p>
        </div>
      </div>

      {/* File list for default mode */}
      {files.length > 0 && mode === 'default' && (
        <div className="upload-files-list">
          {files.map((uploadFile) => (
            <div key={uploadFile.id} className={`upload-file-item ${uploadFile.status}`}>
              {/* File preview */}
              {showPreview && (
                <div className="file-preview">
                  {getFilePreview(uploadFile.file) ? (
                    <img
                      src={getFilePreview(uploadFile.file)!}
                      alt={uploadFile.file.name}
                      onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                    />
                  ) : (
                    <md-icon>insert_drive_file</md-icon>
                  )}
                </div>
              )}

              {/* File info */}
              <div className="file-info">
                <div className="file-name md-typescale-body-medium">
                  {uploadFile.file.name}
                </div>
                <div className="file-size md-typescale-body-small">
                  {formatFileSize(uploadFile.file.size)}
                </div>
                {uploadFile.error && (
                  <div className="file-error md-typescale-body-small">
                    {uploadFile.error}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {uploadFile.status === 'uploading' && (
                <div className="file-progress">
                  <md-linear-progress
                    value={uploadFile.progress / 100}
                  ></md-linear-progress>
                  <span className="progress-text md-typescale-body-small">
                    {Math.round(uploadFile.progress)}%
                  </span>
                </div>
              )}

              {/* Status icon and actions */}
              <div className="file-actions">
                {uploadFile.status === 'success' && (
                  <md-icon class="status-icon success">check_circle</md-icon>
                )}
                {uploadFile.status === 'error' && (
                  <md-icon-button
                    onClick={() => retryUpload(uploadFile.id)}
                    title="Retry upload"
                  >
                    <md-icon>refresh</md-icon>
                  </md-icon-button>
                )}
                <md-icon-button
                  onClick={() => removeFile(uploadFile.id)}
                  title="Remove file"
                >
                  <md-icon>close</md-icon>
                </md-icon-button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Return appropriate mode
  return mode === 'cover' ? renderCoverMode() : renderDefaultMode();
};

export default EnhancedFileUpload;
