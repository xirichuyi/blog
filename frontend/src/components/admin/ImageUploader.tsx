import React, { useCallback, useState } from 'react';
import { adminApi } from '../../services/api';

interface ImageUploaderProps {
  onImageUploaded?: (imageUrl: string) => void;
  className?: string;
}

export default function ImageUploader({ onImageUploaded, className = '' }: ImageUploaderProps) {
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
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      <label className="block text-sm font-medium mb-3">Image Upload</label>
      
      {/* Upload Area */}
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="image-upload"
          />
          
          {isUploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-gray-400">
                Uploading... {uploadProgress}%
              </p>
              {uploadProgress > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <svg 
                className="w-12 h-12 text-gray-400 mx-auto" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              <div>
                <label 
                  htmlFor="image-upload"
                  className="cursor-pointer text-primary hover:text-primary/80 font-medium"
                >
                  Click to upload
                </label>
                <p className="text-sm text-gray-400 mt-1">
                  PNG, JPG, WebP up to 5MB
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Recent Uploads</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedImages.map((imageUrl, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between bg-gray-700 rounded p-2"
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={imageUrl} 
                      alt="Uploaded" 
                      className="w-10 h-10 object-cover rounded"
                    />
                    <span className="text-sm text-gray-300 truncate max-w-32">
                      {imageUrl.split('/').pop()}
                    </span>
                  </div>
                  <button
                    onClick={() => copyImageMarkdown(imageUrl)}
                    className="text-primary hover:text-primary/80 text-sm px-2 py-1 rounded"
                    title="Copy Markdown"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Images are automatically copied as Markdown when uploaded</p>
          <p>• Click "Copy" to copy Markdown syntax again</p>
          <p>• Paste directly into your content editor</p>
        </div>
      </div>
    </div>
  );
}
