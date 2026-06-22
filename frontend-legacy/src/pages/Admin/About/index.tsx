// About Management Component with Ant Design

import React, { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../../components/adminLayout/AdminLayout';
import { apiService } from '../../../services/api';
import {
  Form,
  Input,
  Button,
  Card,
  Upload,
  Spin,
  Typography,
  Space,
  message,
} from 'antd';
import {
  SaveOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import './style.css';

const { TextArea } = Input;
const { Text } = Typography;

const AboutManagement: React.FC = () => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAboutData();
  }, []);

  const loadAboutData = async () => {
    setIsLoading(true);
    try {
      const resp = await apiService.getAbout();
      if (resp.success && resp.data) {
        setTitle(resp.data.title);
        setSubtitle(resp.data.subtitle);
        setContent(resp.data.content);
        setPhotoUrl(resp.data.photo_url ? apiService.getImageUrl(resp.data.photo_url) : '');
      }
    } catch (error) {
      message.error('Failed to load about information');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const result = await apiService.uploadPostImage(file);
      if (result.success && result.data?.file_url) {
        const url = apiService.getImageUrl(result.data.file_url);
        setPhotoUrl(url);
        message.success('Image uploaded successfully');
      } else {
        message.error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async () => {
    try {
      setPhotoUrl('');
      const resp = await apiService.updateAbout({ photo_url: '' });
      if (resp.success) {
        message.success('Image removed successfully');
      } else {
        message.error(resp.error || 'Failed to remove image');
      }
      await loadAboutData();
    } catch (error) {
      message.error('Failed to remove image');
    }
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const payload: { title: string; subtitle: string; content: string; photo_url?: string } = {
        title,
        subtitle,
        content,
      };
      if (photoUrl) {
        payload.photo_url = photoUrl.startsWith('http') ? photoUrl : photoUrl;
      }
      const resp = await apiService.updateAbout(payload);
      if (resp.success) {
        message.success('About information saved successfully');
        await loadAboutData();
      } else {
        message.error(resp.error || 'Failed to save');
      }
    } catch (error) {
      message.error('Failed to save about information');
    } finally {
      setIsSaving(false);
    }
  };

  const headerActions = (
    <Button
      type="primary"
      icon={<SaveOutlined />}
      onClick={save}
      loading={isSaving}
    >
      Save Changes
    </Button>
  );

  if (isLoading) {
    return (
      <AdminLayout title="About Management">
        <div className="about-management-loading">
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>
            Loading about information...
          </Text>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="About Management" actions={headerActions}>
      <div className="about-management-page">
        {/* Basic Information */}
        <Card className="form-section" title="Basic Information">
          <Form layout="vertical">
            <div className="basic-info-grid">
              <Form.Item label="Title" required>
                <Input
                  placeholder="Enter title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  size="large"
                />
              </Form.Item>
              <Form.Item label="Subtitle">
                <Input
                  placeholder="Enter subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  size="large"
                />
              </Form.Item>
            </div>

            {/* Profile Image Upload */}
            <Form.Item label="Profile Image">
              {photoUrl ? (
                <div className="image-preview">
                  <img src={photoUrl} alt="Profile" />
                  <div className="image-actions">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => fileRef.current?.click()}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={removeImage}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="upload-area"
                  onClick={() => fileRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="upload-progress">
                      <Spin />
                      <Text type="secondary">Uploading...</Text>
                    </div>
                  ) : (
                    <>
                      <CloudUploadOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
                      <Text style={{ marginTop: 12 }}>Click to upload image</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        JPG, PNG, WebP, GIF (Max 10MB)
                      </Text>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                  e.currentTarget.value = '';
                }}
              />
            </Form.Item>
          </Form>
        </Card>

        {/* Content Section */}
        <Card className="form-section" title="About Content">
          <Form layout="vertical">
            <Form.Item>
              <TextArea
                placeholder="Write about yourself..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="content-textarea"
              />
            </Form.Item>
            <div className="content-help">
              <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              <Text type="secondary">You can use markdown formatting in your content</Text>
            </div>
          </Form>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AboutManagement;
