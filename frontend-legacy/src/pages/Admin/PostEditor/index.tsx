// Post Editor Component with Ant Design

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import MarkdownRenderer from '../../../components/ui/MarkdownRenderer';
import CoverUpload from '../../../components/ui/CoverUpload';
import { useKeyboardShortcuts, createCommonShortcuts } from '../../../hooks/useKeyboardShortcuts';
import AdminLayout from '../../../components/adminLayout/AdminLayout';
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Card,
  Tag,
  Space,
  Typography,
  Spin,
  Alert,
  Upload,
  Modal,
  message,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  PictureOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  InboxOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import './style.css';

const { TextArea } = Input;
const { Text } = Typography;

interface PostFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  featured: boolean;
  status: 'draft' | 'published';
  coverUrl?: string;
  images: string[];
}

interface Category {
  id: string;
  name: string;
}

interface TagItem {
  id: string;
  name: string;
}

const PostEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);

  const isEditing = id !== 'new';

  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: [],
    featured: false,
    status: 'draft',
    coverUrl: '',
    images: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Image upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag and drop states for content area
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle cover URL changes
  const handleCoverChange = (url: string | null) => {
    setFormData(prev => ({
      ...prev,
      coverUrl: url || ''
    }));
  };

  // Helper function to extract image URLs from markdown content
  const extractImagesFromContent = (content: string): string[] => {
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    const images: string[] = [];
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      const imageUrl = match[1];
      if (imageUrl && !images.includes(imageUrl)) {
        images.push(imageUrl);
      }
    }

    return images;
  };

  // Helper function to extract PDF URL from markdown content
  const extractPdfUrlFromContent = (content: string): string | null => {
    const pdfRegex = /\[PDF:.*?\]\((\/uploads\/pdfs\/.*?)\)/;
    const match = content.match(pdfRegex);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  };

  // Helper function to insert image into content at cursor position
  const insertImageIntoContent = (imageUrl: string) => {
    const imageMarkdown = `![Image](${imageUrl})`;
    const textarea = contentTextareaRef.current;

    if (textarea) {
      const cursorPosition = textarea.selectionStart || 0;
      const currentContent = formData.content;

      const newContent =
        currentContent.slice(0, cursorPosition) +
        imageMarkdown +
        currentContent.slice(cursorPosition);

      setFormData(prev => ({
        ...prev,
        content: newContent,
        images: [...prev.images, imageUrl].filter((url, index, arr) => arr.indexOf(url) === index)
      }));

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          cursorPosition + imageMarkdown.length,
          cursorPosition + imageMarkdown.length
        );
      }, 0);
    } else {
      const currentContent = formData.content;
      const separator = currentContent && !currentContent.endsWith('\n') ? '\n\n' : '\n';

      setFormData(prev => ({
        ...prev,
        content: prev.content + separator + imageMarkdown,
        images: [...prev.images, imageUrl].filter((url, index, arr) => arr.indexOf(url) === index)
      }));

      message.info('Image has been added to the end of your content.');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await loadCategoriesAndTags();

      if (isEditing && id) {
        loadPost(id);
      }
    };

    initializeData();
  }, [isEditing, id]);

  const loadCategoriesAndTags = async () => {
    try {
      const categoriesResponse = await apiService.getCategories();
      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

      const tagsResponse = await apiService.getTags();
      if (tagsResponse.success && tagsResponse.data) {
        setAvailableTags(tagsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load categories and tags:', error);
      message.error('Failed to load categories and tags data');
    }
  };

  const loadPost = async (postId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getPost(postId);

      if (response.success && response.data) {
        const post = response.data;

        let categoryId = '';
        if (categories.length > 0 && post.category) {
          const matchingCategory = categories.find(cat => cat.name === post.category);
          if (matchingCategory) {
            categoryId = matchingCategory.id;
          }
        }

        const contentImages = extractImagesFromContent(post.content || '');

        setFormData({
          title: post.title,
          excerpt: post.excerpt,
          content: post.content || '',
          category: categoryId,
          tags: post.tags || [],
          featured: post.featured || false,
          status: (post.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
          coverUrl: post.coverImage || post.imageUrl || '',
          images: contentImages,
        });
      } else {
        setError(response.error || 'Failed to load post');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof PostFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTag = (tagName: string) => {
    if (tagName && !formData.tags.includes(tagName)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagName],
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  // Content image upload function
  const handleContentImageUpload = async (file: File): Promise<string | null> => {
    if (!file) return null;

    try {
      setIsUploadingImage(true);
      const result = await apiService.uploadPostImage(file);

      if (result.success && result.data?.file_url) {
        message.success('Image has been uploaded successfully');
        return apiService.getImageUrl(result.data.file_url);
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      message.error(error instanceof Error ? error.message : 'Failed to upload image');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // PDF upload function
  const handleContentPdfUpload = async (file: File): Promise<string | null> => {
    if (!file) return null;

    try {
      setIsUploadingImage(true);
      const postId = isEditing && id ? parseInt(id) : undefined;
      const result = await apiService.uploadPdf(file, postId);

      if (result.success && result.data?.file_url) {
        message.success('PDF has been uploaded successfully');
        return result.data.file_url;
      } else {
        throw new Error(result.error || 'Failed to upload PDF');
      }
    } catch (error) {
      console.error('PDF upload failed:', error);
      message.error(error instanceof Error ? error.message : 'Failed to upload PDF');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Helper function to insert PDF into content at cursor position
  const insertPdfIntoContent = (pdfUrl: string) => {
    const fileName = pdfUrl.split('/').pop() || 'PDF Document';
    const pdfMarkdownCore = `[PDF: ${fileName}](${pdfUrl})`;
    const textarea = contentTextareaRef.current;

    if (textarea) {
      const cursorPosition = textarea.selectionStart || 0;
      const currentContent = formData.content;

      // Check if we need line breaks before/after to ensure PDF is a separate paragraph
      const beforeChar = currentContent[cursorPosition - 1];
      const afterChar = currentContent[cursorPosition];

      // Add line breaks if not at start/end of content and not already preceded/followed by newlines
      let prefix = '';
      let suffix = '\n\n';

      if (cursorPosition > 0 && beforeChar && beforeChar !== '\n') {
        prefix = '\n\n';
      } else if (cursorPosition > 0 && beforeChar === '\n' && currentContent[cursorPosition - 2] !== '\n') {
        prefix = '\n';
      }

      if (afterChar && afterChar !== '\n') {
        suffix = '\n\n';
      }

      const pdfMarkdown = prefix + pdfMarkdownCore + suffix;

      const newContent =
        currentContent.slice(0, cursorPosition) +
        pdfMarkdown +
        currentContent.slice(cursorPosition);

      setFormData(prev => ({
        ...prev,
        content: newContent,
      }));

      setTimeout(() => {
        textarea?.focus();
        const newPosition = cursorPosition + pdfMarkdown.length;
        textarea?.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      setFormData(prev => ({
        ...prev,
        content: prev.content + '\n\n' + pdfMarkdownCore + '\n\n',
      }));
    }
  };

  // Handle drag and drop events for content area
  const handleContentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleContentDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleContentDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const pdfFiles = files.filter(file => file.type === 'application/pdf');

    if (pdfFiles.length > 0) {
      for (const file of pdfFiles) {
        const pdfFileName = await handleContentPdfUpload(file);
        if (pdfFileName) {
          insertPdfIntoContent(pdfFileName);
        }
      }
    }

    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const imageUrl = await handleContentImageUpload(file);
        if (imageUrl) {
          insertImageIntoContent(imageUrl);
        }
      }
    }

    if (imageFiles.length === 0 && pdfFiles.length === 0) {
      message.warning('Please drop image or PDF files only.');
    }
  };

  // Handle paste events for content area
  const handleContentPaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    const files = Array.from(clipboardData.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      e.preventDefault();
      for (const file of imageFiles) {
        const imageUrl = await handleContentImageUpload(file);
        if (imageUrl) {
          insertImageIntoContent(imageUrl);
        }
      }
      return;
    }

    const items = Array.from(clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          const imageUrl = await handleContentImageUpload(file);
          if (imageUrl) {
            insertImageIntoContent(imageUrl);
          }
        }
      }
    }
  };

  const handleSave = async (status: 'draft' | 'published') => {
    try {
      setIsSaving(true);
      setError(null);

      const currentImages = extractImagesFromContent(formData.content);
      const pdfUrl = extractPdfUrlFromContent(formData.content);

      const postData = {
        title: formData.title.trim() || 'Untitled',
        excerpt: formData.excerpt.trim() || (formData.content.trim() ? formData.content.substring(0, 150) + '...' : 'No excerpt'),
        content: formData.content.trim() || '',
        category: formData.category,
        tags: formData.tags,
        featured: formData.featured,
        status,
        coverImage: formData.coverUrl,
        author: user?.username || 'Admin',
        publishDate: status === 'published' ? new Date().toISOString() : undefined,
        readTime: Math.ceil((formData.content || '').split(' ').length / 200),
        images: currentImages,
        pdf_url: pdfUrl || undefined,
      };

      let response;
      if (isEditing && id) {
        response = await apiService.updatePost(id, postData);
      } else {
        response = await apiService.createPost(postData);
      }

      if (response.success) {
        message.success(
          status === 'published'
            ? `"${formData.title}" has been published successfully.`
            : `"${formData.title}" has been saved as draft.`
        );
        navigate('/admin/posts');
      } else {
        throw new Error(response.error || 'Failed to save post');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    Modal.confirm({
      title: 'Discard Changes',
      content: 'Are you sure you want to discard your changes?',
      okText: 'Discard',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => navigate('/admin/posts'),
    });
  };

  // Keyboard shortcuts
  const shortcuts = createCommonShortcuts({
    save: () => handleSave('draft'),
    publish: () => handleSave('published'),
    cancel: handleCancel,
    preview: () => setPreviewMode(!previewMode)
  });

  useKeyboardShortcuts(shortcuts, { enabled: !isSaving });

  const pageTitle = isEditing ? 'Edit Post' : 'New Post';

  // Header actions
  const headerActions = (
    <Space size="middle">
      <Button onClick={handleCancel}>
        Cancel
      </Button>
      <Button
        icon={<SaveOutlined />}
        onClick={() => handleSave('draft')}
        loading={isSaving}
      >
        Save Draft
      </Button>
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={() => handleSave('published')}
        loading={isSaving}
      >
        Publish
      </Button>
    </Space>
  );

  // Custom upload props for image insertion
  const imageUploadProps = {
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: async (file: File) => {
      const imageUrl = await handleContentImageUpload(file);
      if (imageUrl) {
        insertImageIntoContent(imageUrl);
      }
      return false;
    },
  };

  // Custom upload props for PDF insertion
  const pdfUploadProps = {
    accept: '.pdf',
    showUploadList: false,
    beforeUpload: async (file: File) => {
      const pdfUrl = await handleContentPdfUpload(file);
      if (pdfUrl) {
        insertPdfIntoContent(pdfUrl);
      }
      return false;
    },
  };

  if (isLoading) {
    return (
      <AdminLayout title={pageTitle}>
        <div className="post-editor-loading">
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>Loading post...</Text>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={pageTitle} actions={headerActions}>
      <div className="post-editor">
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Basic Info Section */}
        <Card className="form-section" title="Basic Information">
          <Form layout="vertical">
            <Form.Item
              label="Post Title"
              required
              validateStatus={!formData.title.trim() ? 'error' : ''}
            >
              <Input
                placeholder="Enter post title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                size="large"
              />
            </Form.Item>

            <Form.Item label="Excerpt">
              <TextArea
                placeholder="Enter a brief excerpt (optional)"
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                rows={3}
              />
            </Form.Item>

            <Form.Item label="Cover Image">
              <CoverUpload
                value={formData.coverUrl}
                onChange={handleCoverChange}
                placeholder="Upload Cover Image"
                maxSize={10}
                supportPaste={true}
                supportDragDrop={true}
              />
            </Form.Item>
          </Form>
        </Card>

        {/* Content Section */}
        <Card
          className="form-section"
          title={
            <div className="content-card-header">
              <div>
                <span>Content</span>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                  Supports Markdown, drag & drop images, paste from clipboard
                </Text>
              </div>
              <Space>
                <Upload {...imageUploadProps}>
                  <Button
                    icon={<PictureOutlined />}
                    loading={isUploadingImage}
                  >
                    Insert Image
                  </Button>
                </Upload>
                <Upload {...pdfUploadProps}>
                  <Button
                    icon={<FilePdfOutlined />}
                    loading={isUploadingImage}
                  >
                    Insert PDF
                  </Button>
                </Upload>
                <Button
                  icon={previewMode ? <EditOutlined /> : <EyeOutlined />}
                  onClick={() => setPreviewMode(!previewMode)}
                  type={previewMode ? 'primary' : 'default'}
                >
                  {previewMode ? 'Edit' : 'Preview'}
                </Button>
              </Space>
            </div>
          }
        >
          {previewMode ? (
            <div className="content-preview">
              <MarkdownRenderer
                content={formData.content || 'No content to preview'}
                className="markdown-preview"
              />
            </div>
          ) : (
            <div
              className={`content-editor-wrapper ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleContentDragOver}
              onDragLeave={handleContentDragLeave}
              onDrop={handleContentDrop}
            >
              <TextArea
                ref={contentTextareaRef}
                placeholder="Write your content in Markdown..."
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                onPaste={handleContentPaste}
                rows={20}
                className="content-textarea"
              />
              {isDragOver && (
                <div className="drag-overlay">
                  <div className="drag-overlay-content">
                    <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    <p>Drop images or PDFs here to upload</p>
                    <Text type="secondary">Files will be uploaded and inserted as markdown</Text>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Metadata Section */}
        <Card className="form-section" title="Metadata">
          <Form layout="vertical">
            <div className="metadata-row">
              <Form.Item
                label="Category"
                required
                validateStatus={!formData.category ? 'error' : ''}
                style={{ flex: 1 }}
              >
                <Select
                  placeholder="Select Category"
                  value={formData.category || undefined}
                  onChange={(value) => handleInputChange('category', value)}
                  size="large"
                >
                  {categories.map((category) => (
                    <Select.Option key={category.id} value={category.id}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Featured Post" style={{ marginBottom: 0 }}>
                <Switch
                  checked={formData.featured}
                  onChange={(checked) => handleInputChange('featured', checked)}
                />
              </Form.Item>
            </div>

            <Divider />

            <Form.Item label="Tags">
              <div className="tags-section">
                {formData.tags.length > 0 && (
                  <div className="current-tags">
                    {formData.tags.map((tag) => (
                      <Tag
                        key={tag}
                        closable
                        onClose={() => handleRemoveTag(tag)}
                        color="blue"
                      >
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}

                {availableTags.length > 0 && (
                  <div className="available-tags">
                    <Text type="secondary" style={{ marginRight: 8 }}>
                      Popular tags:
                    </Text>
                    {availableTags
                      .filter(tag => !formData.tags.includes(tag.name))
                      .slice(0, 8)
                      .map(tag => (
                        <Tag
                          key={tag.id}
                          className="available-tag"
                          onClick={() => handleAddTag(tag.name)}
                        >
                          <PlusOutlined /> {tag.name}
                        </Tag>
                      ))}
                  </div>
                )}
              </div>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default PostEditor;
