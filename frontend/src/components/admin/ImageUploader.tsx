import React, { useCallback, useState } from 'react';
import { adminApi } from '../../services/api';

interface ImageUploaderProps {
  onImageUploaded?: (imageUrl: string) => void;
  currentImage?: string;
  className?: string;
}

export default function ImageUploader({ onImageUploaded, currentImage, className = '' }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const imageUrl = await adminApi.uploadImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // 添加到已上传图片列表
      setUploadedImages(prev => [...prev, imageUrl]);
      
      // 回调通知父组件
      onImageUploaded?.(imageUrl);
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(`![Image](${imageUrl})`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const copyImageMarkdown = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(`![Image](${imageUrl})`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className={`${className}`}>
      {/* Current Image Preview */}
      {currentImage && (
        <div className="mb-2">
          <img
            src={currentImage}
            alt="Featured"
            className="w-full h-20 object-cover rounded-lg border border-gray-600"
          />
        </div>
      )}

      {/* Upload Button */}
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
          id="image-upload"
        />

        <label
          htmlFor="image-upload"
          className={`admin-btn admin-btn-secondary w-full justify-center cursor-pointer ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border border-white/20 border-t-white mr-2"></div>
              {uploadProgress}%
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {currentImage ? 'Change' : 'Upload'}
            </>
          )}
        </label>

        {/* Progress Bar */}
        {isUploading && uploadProgress > 0 && (
          <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-2 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
