// Post Editor Component

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useData } from '../../contexts/DataContext';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import type { Article, Category, Tag } from '../../types';
import AdminLayout from './AdminLayout';
import './PostEditor.css';

interface PostFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  featured: boolean;
  status: 'draft' | 'published';
  coverUrl?: string;
}

interface ImageUploadResponse {
  success: boolean;
  data?: {
    file_url: string;
    file_name: string;
    file_size: number;
  };
  error?: string;
}

const PostEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { categories, tags: availableTags } = useData();
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
  });

  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Image upload states
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {
    if (isEditing && id) {
      loadPost(id);
    }
  }, [isEditing, id]);



  const loadPost = async (postId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Load real post data from API
      const response = await apiService.getPost(postId);

      if (response.success && response.data) {
        const post = response.data;

        // Find the category name by matching with available categories
        let categoryId = '';
        const matchingCategory = categories.find(cat => cat.name === post.category);
        if (matchingCategory) {
          categoryId = matchingCategory.id;
        }

        setFormData({
          title: post.title,
          excerpt: post.excerpt,
          content: post.content || '',
          category: categoryId,
          tags: post.tags,
          featured: post.featured || false,
          status: post.status || 'draft',
          coverUrl: post.coverImage || post.imageUrl || '',
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

  const handleInputChange = (field: keyof PostFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTag = (tagName?: string) => {
    const tag = (tagName || tagInput.trim());
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const handleSelectExistingTag = (tagName: string) => {
    handleAddTag(tagName);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const getAvailableTags = () => {
    return availableTags.filter(tag =>
      !formData.tags.includes(tag.name) &&
      tag.name.toLowerCase().includes(tagInput.toLowerCase())
    );
  };

  // Image upload functions
  const handleCoverUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showNotification({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please select a valid image file (JPG, PNG, WebP, GIF)',
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'Image size must be less than 10MB',
      });
      return;
    }

    try {
      setIsUploadingCover(true);

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006';
      const authToken = localStorage.getItem('admin_token') || 'admin123456';

      if (isEditing && id) {
        // Update existing post cover
        const formData = new FormData();
        formData.append('cover', file);

        const response = await fetch(`${API_BASE_URL}/api/post/update_cover/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: formData,
        });

        const result = await response.json();

        if (result.code === 200 && result.data) {
          const coverUrl = result.data.cover_url;
          const fullCoverUrl = coverUrl.startsWith('http') ? coverUrl : `${API_BASE_URL}${coverUrl}`;

          setFormData(prev => ({
            ...prev,
            coverUrl: fullCoverUrl,
          }));

          showNotification({
            type: 'success',
            title: 'Cover Updated',
            message: 'Post cover has been updated successfully',
          });
        } else {
          throw new Error(result.message || 'Failed to update cover');
        }
      } else {
        // Upload image for new post
        const uploadFormData = new FormData();
        uploadFormData.append('image', file);

        const response = await fetch(`${API_BASE_URL}/api/post/upload_post_image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: uploadFormData,
        });

        const result = await response.json();

        if (result.code === 200 && result.data) {
          const coverUrl = result.data.file_url;
          const fullCoverUrl = coverUrl.startsWith('http') ? coverUrl : `${API_BASE_URL}${coverUrl}`;

          setFormData(prev => ({
            ...prev,
            coverUrl: fullCoverUrl,
          }));

          showNotification({
            type: 'success',
            title: 'Cover Uploaded',
            message: 'Cover image has been uploaded successfully',
          });
        } else {
          throw new Error(result.message || 'Failed to upload cover');
        }
      }
    } catch (error) {
      console.error('Cover upload failed:', error);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Failed to upload cover image',
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleContentImageUpload = async (file: File): Promise<string | null> => {
    if (!file) return null;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showNotification({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please select a valid image file (JPG, PNG, WebP, GIF)',
      });
      return null;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'Image size must be less than 10MB',
      });
      return null;
    }

    try {
      setIsUploadingImage(true);

      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006';
      const response = await fetch(`${API_BASE_URL}/api/post/upload_post_image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || 'admin123456'}`,
        },
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.code === 200 && result.data) {
        showNotification({
          type: 'success',
          title: 'Image Uploaded',
          message: 'Image has been uploaded successfully',
        });

        // Handle both absolute and relative URLs
        const imageUrl = result.data.file_url;
        if (imageUrl.startsWith('http')) {
          return imageUrl;
        } else {
          return `${API_BASE_URL}${imageUrl}`;
        }
      } else {
        throw new Error(result.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Failed to upload image',
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const insertImageIntoContent = (imageUrl: string) => {
    const imageMarkdown = `![Image](${imageUrl})`;
    const textarea = document.querySelector('md-outlined-text-field[label="Content"] textarea') as HTMLTextAreaElement;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = formData.content;

      const newContent = currentContent.substring(0, start) + imageMarkdown + currentContent.substring(end);

      setFormData(prev => ({
        ...prev,
        content: newContent,
      }));

      // Set cursor position after the inserted image
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
      }, 0);
    }
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setShowTagSuggestions(value.length > 0);
  };

  const handleSave = async (status: 'draft' | 'published') => {
    try {
      setIsSaving(true);
      setError(null);

      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      if (!formData.content.trim()) {
        throw new Error('Content is required');
      }

      const postData = {
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim() || formData.content.substring(0, 150) + '...',
        content: formData.content.trim(),
        category: formData.category,
        tags: formData.tags,
        featured: formData.featured,
        status,
        author: 'Admin', // This should come from auth context
        publishDate: status === 'published' ? new Date().toISOString() : undefined,
        readTime: Math.ceil(formData.content.split(' ').length / 200), // Estimate reading time
      };

      let response;
      if (isEditing && id) {
        response = await apiService.updatePost(id, postData);
      } else {
        response = await apiService.createPost(postData);
      }

      if (response.success) {
        // Show success notification
        showNotification({
          type: 'success',
          title: status === 'published' ? 'Post Published!' : 'Draft Saved!',
          message: `"${formData.title}" has been ${status === 'published' ? 'published' : 'saved as draft'} successfully.`,
        });
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
    if (confirm('Are you sure you want to discard your changes?')) {
      navigate('/admin/posts');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title={isEditing ? 'Edit Post' : 'New Post'}>
        <div className="post-editor-loading">
          <md-circular-progress indeterminate></md-circular-progress>
          <p className="md-typescale-body-medium">Loading post...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isEditing ? 'Edit Post' : 'New Post'}>
      <div className="post-editor">
        {error && (
          <div className="post-editor-error">
            <md-icon>error</md-icon>
            <span>{error}</span>
          </div>
        )}

        {/* Header */}
        <div className="post-editor-header">
          <div className="editor-title">
            <h1 className="md-typescale-display-small">
              {isEditing ? 'Edit Post' : 'Create New Post'}
            </h1>
          </div>
          
          <div className="editor-actions">
            <md-text-button onClick={handleCancel}>
              Cancel
            </md-text-button>
            
            <md-outlined-button
              onClick={() => handleSave('draft')}
            >
              {isSaving ? (
                <>
                  <md-circular-progress 
                    indeterminate 
                    slot="icon"
                    style={{ width: '18px', height: '18px' }}
                  ></md-circular-progress>
                  Saving...
                </>
              ) : (
                <>
                  <md-icon slot="icon">save</md-icon>
                  Save Draft
                </>
              )}
            </md-outlined-button>
            
            <md-filled-button
              onClick={() => handleSave('published')}
            >
              {isSaving ? (
                <>
                  <md-circular-progress 
                    indeterminate 
                    slot="icon"
                    style={{ width: '18px', height: '18px' }}
                  ></md-circular-progress>
                  Publishing...
                </>
              ) : (
                <>
                  <md-icon slot="icon">publish</md-icon>
                  Publish
                </>
              )}
            </md-filled-button>
          </div>
        </div>

        {/* Form */}
        <div className="post-editor-form">
          {/* Basic Info */}
          <div className="form-section">
            <h2 className="md-typescale-headline-small">Basic Information</h2>

            <md-outlined-text-field
              label="Post Title"
              value={formData.title}
              onInput={(e: any) => handleInputChange('title', e.target.value)}
              required
              class="title-field"
            ></md-outlined-text-field>

            <md-outlined-text-field
              label="Excerpt"
              value={formData.excerpt}
              onInput={(e: any) => handleInputChange('excerpt', e.target.value)}
              type="textarea"
              rows={3}
              class="excerpt-field"
            ></md-outlined-text-field>

            {/* Cover Image Upload */}
            <div className="cover-upload-section">
              <label className="md-typescale-body-large">Cover Image</label>
              <div className="cover-upload-container">
                {formData.coverUrl ? (
                  <div className="cover-preview">
                    <img
                      src={formData.coverUrl.startsWith('http') ? formData.coverUrl : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006'}${formData.coverUrl}`}
                      alt="Cover preview"
                      className="cover-image"
                    />
                    <div className="cover-overlay">
                      <md-icon-button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={isUploadingCover}
                      >
                        <md-icon>edit</md-icon>
                      </md-icon-button>
                      <md-icon-button
                        onClick={() => setFormData(prev => ({ ...prev, coverUrl: '' }))}
                        disabled={isUploadingCover}
                      >
                        <md-icon>delete</md-icon>
                      </md-icon-button>
                    </div>
                    {isUploadingCover && (
                      <div className="upload-progress">
                        <md-circular-progress indeterminate></md-circular-progress>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="cover-upload-area"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {isUploadingCover ? (
                      <div className="upload-progress">
                        <md-circular-progress indeterminate></md-circular-progress>
                        <p className="md-typescale-body-medium">Uploading cover...</p>
                      </div>
                    ) : (
                      <>
                        <md-icon class="upload-icon">cloud_upload</md-icon>
                        <p className="md-typescale-body-large">Upload Cover Image</p>
                        <p className="md-typescale-body-small">Click to select or drag and drop</p>
                        <p className="md-typescale-body-small">Supported: JPG, PNG, WebP, GIF (Max 10MB)</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleCoverUpload(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="form-section">
            <div className="content-header">
              <h2 className="md-typescale-headline-small">Content</h2>
              <div className="content-actions">
                <md-outlined-button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage ? 'true' : undefined}
                >
                  <md-icon slot="icon">image</md-icon>
                  {isUploadingImage ? 'Uploading...' : 'Insert Image'}
                </md-outlined-button>

                <md-outlined-button
                  onClick={() => setPreviewMode(!previewMode)}
                  class={previewMode ? 'active' : ''}
                >
                  <md-icon slot="icon">{previewMode ? 'edit' : 'preview'}</md-icon>
                  {previewMode ? 'Edit' : 'Preview'}
                </md-outlined-button>
              </div>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const imageUrl = await handleContentImageUpload(file);
                  if (imageUrl) {
                    insertImageIntoContent(imageUrl);
                  }
                }
                // Reset input value to allow uploading the same file again
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />
            
            {previewMode ? (
              <div className="content-preview">
                <MarkdownRenderer
                  content={formData.content || 'No content to preview'}
                  className="markdown-preview"
                />
              </div>
            ) : (
              <md-outlined-text-field
                label="Content (Markdown)"
                value={formData.content}
                onInput={(e: any) => handleInputChange('content', e.target.value)}
                type="textarea"
                rows={20}
                class="content-field"
              ></md-outlined-text-field>
            )}
          </div>

          {/* Metadata */}
          <div className="form-section">
            <h2 className="md-typescale-headline-small">Metadata</h2>
            
            <div className="metadata-grid">
              <md-outlined-select
                label="Category"
                value={formData.category}
                onInput={(e: any) => handleInputChange('category', e.target.value)}
              >
                <md-select-option value="">Select Category</md-select-option>
                {categories.map((category) => (
                  <md-select-option key={category.id} value={category.id}>
                    {category.name}
                  </md-select-option>
                ))}
              </md-outlined-select>
              
              <div className="featured-toggle">
                <md-switch
                  selected={formData.featured}
                  onChange={(e: any) => handleInputChange('featured', e.target.selected)}
                ></md-switch>
                <span className="md-typescale-body-medium">Featured Post</span>
              </div>
            </div>
            
            {/* Tags */}
            <div className="tags-section">
              <div className="tags-input-container">
                <div className="tags-input">
                  <md-outlined-text-field
                    label="Add tags"
                    value={tagInput}
                    onInput={(e: any) => handleTagInputChange(e.target.value)}
                    onKeyDown={handleKeyPress}
                    class="tag-input-field"
                    placeholder="Type to search existing tags or add new ones"
                  >
                    <md-icon-button slot="trailing-icon" onClick={() => handleAddTag()}>
                      <md-icon>add</md-icon>
                    </md-icon-button>
                  </md-outlined-text-field>
                </div>

                {/* Available Tags Suggestions */}
                {showTagSuggestions && getAvailableTags().length > 0 && (
                  <div className="tag-suggestions">
                    <div className="suggestions-header">Available tags:</div>
                    <div className="suggestions-list">
                      {getAvailableTags().map(tag => (
                        <md-assist-chip
                          key={tag.id}
                          label={tag.name}
                          onClick={() => handleSelectExistingTag(tag.name)}
                          class="suggestion-chip"
                        >
                          <md-icon slot="icon">add</md-icon>
                          {tag.name}
                        </md-assist-chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show all available tags when input is empty */}
                {!showTagSuggestions && availableTags.length > 0 && (
                  <div className="all-tags">
                    <div className="suggestions-header">Available tags (click to add):</div>
                    <div className="suggestions-list">
                      {availableTags
                        .filter(tag => !formData.tags.includes(tag.name))
                        .map(tag => (
                        <md-assist-chip
                          key={tag.id}
                          label={tag.name}
                          onClick={() => handleSelectExistingTag(tag.name)}
                          class="available-chip"
                        >
                          <md-icon slot="icon">add</md-icon>
                          {tag.name}
                        </md-assist-chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Current Tags */}
              {formData.tags.length > 0 && (
                <div className="current-tags">
                  <div className="suggestions-header">Current tags:</div>
                  <div className="tags-list">
                    {formData.tags.map((tag, index) => (
                      <div key={index} className="current-tag-wrapper">
                        <md-assist-chip class="tag-chip current-tag-chip">
                          {tag}
                        </md-assist-chip>
                        <button
                          className="remove-tag-btn"
                          onClick={() => handleRemoveTag(tag)}
                          title={`Remove ${tag} tag`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PostEditor;
