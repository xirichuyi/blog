"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  className?: string;
}

interface UploadResponse {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}

export default function ImageUploader({ onImageUploaded, className = '' }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
        },
        body: formData
      });

      const result: UploadResponse = await response.json();

      if (result.success && result.url) {
        onImageUploaded(result.url);
        setUploadProgress(100);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [onImageUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false
  });

  return (
    <div className={`relative ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-apple-gray-300 dark:border-apple-gray-600 hover:border-primary'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-apple-gray-600 dark:text-apple-gray-300">
              Uploading... {uploadProgress}%
            </p>
            {uploadProgress > 0 && (
              <div className="w-full bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <svg 
              className="mx-auto h-12 w-12 text-apple-gray-400" 
              stroke="currentColor" 
              fill="none" 
              viewBox="0 0 48 48"
            >
              <path 
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                strokeWidth={2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
            <div>
              <p className="text-sm text-apple-gray-600 dark:text-apple-gray-300">
                {isDragActive ? (
                  "Drop the image here..."
                ) : (
                  <>
                    <span className="font-medium text-primary">Click to upload</span> or drag and drop
                  </>
                )}
              </p>
              <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400">
                PNG, JPG, WebP, GIF up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
