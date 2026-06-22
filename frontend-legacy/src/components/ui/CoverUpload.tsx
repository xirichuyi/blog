// CoverUpload Component with Ant Design

import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Upload, Button, Spin, message } from 'antd';
import {
  CloudUploadOutlined,
  EditOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import './CoverUpload.css';

interface CoverUploadProps {
  value?: string;
  onChange?: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  maxSize?: number;
  accept?: string;
  supportPaste?: boolean;
  supportDragDrop?: boolean;
}

const { Dragger } = Upload;

const CoverUpload: React.FC<CoverUploadProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Upload Cover Image',
  maxSize = 10,
  supportPaste = true,
  supportDragDrop = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle paste events
  useEffect(() => {
    if (!supportPaste || disabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const files = Array.from(clipboardData.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleFileUpload(imageFiles[0]);
        return;
      }

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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid image file (JPG, PNG, WebP, GIF)';
    }

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
      message.error(validationError);
      return;
    }

    try {
      setIsUploading(true);

      const result = await apiService.uploadPostCover(file);

      if (result.success && result.data?.file_url) {
        const fullCoverUrl = apiService.getImageUrl(result.data.file_url);
        const cacheBustedUrl = `${fullCoverUrl}?t=${Date.now()}`;
        onChange?.(cacheBustedUrl);
        message.success('Cover image uploaded successfully');
      } else {
        throw new Error(result.error || 'Failed to upload cover');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload cover image';
      message.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove cover
  const removeCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
  };

  // Change cover
  const changeCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Upload props for Dragger
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    disabled: disabled || isUploading,
    accept: 'image/jpeg,image/jpg,image/png,image/webp,image/gif',
    beforeUpload: async (file) => {
      await handleFileUpload(file);
      return false;
    },
  };

  return (
    <div className={`cover-upload-antd ${className}`} ref={containerRef} tabIndex={0}>
      {/* Hidden file input for change button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />

      {value ? (
        <div className="cover-preview-antd">
          <img src={value} alt="Cover preview" className="cover-image-antd" />
          <div className="cover-overlay-antd">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={changeCover}
              loading={isUploading}
            >
              Change
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={removeCover}
              disabled={isUploading}
            >
              Remove
            </Button>
          </div>
          {isUploading && (
            <div className="upload-progress-overlay-antd">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
              <span>Uploading...</span>
            </div>
          )}
        </div>
      ) : (
        <Dragger {...uploadProps} className="cover-dragger-antd">
          {isUploading ? (
            <div className="upload-progress-content-antd">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
              <p style={{ marginTop: 16, color: '#666' }}>Uploading cover...</p>
            </div>
          ) : (
            <>
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined style={{ fontSize: 48, color: '#faad14' }} />
              </p>
              <p className="ant-upload-text">{placeholder}</p>
              <p className="ant-upload-hint">
                {supportDragDrop ? 'Drag & drop, click to browse' : 'Click to select'}
                {supportPaste ? ', or paste from clipboard' : ''}
              </p>
              <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                Images only · Max {maxSize}MB · Supports JPG, PNG, WebP, GIF
              </p>
            </>
          )}
        </Dragger>
      )}
    </div>
  );
};

export default CoverUpload;
