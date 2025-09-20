// Post Editor Component

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/api'
import { useNotification } from '../../../contexts/NotificationContext';
import { useData } from '../../../contexts/DataContext';
import MarkdownRenderer from '../../../components/ui/MarkdownRenderer';
import CoverUpload from '../../../components/ui/CoverUpload';
import { useKeyboardShortcuts, createCommonShortcuts } from '../../../hooks/useKeyboardShortcuts';

import AdminLayout from '../../../components/admin/AdminLayout';
import './style.css';

interface PostFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  featured: boolean;
  status: 'draft' | 'published';
  coverUrl?: string;
  images: string[]; // Array of image URLs used in content
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
    images: [],
  });


  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Image upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop states for content area
  const [isDragOver, setIsDragOver] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Helper function to insert image into content at cursor position
  const insertImageIntoContent = (imageUrl: string) => {
    const imageMarkdown = `![Image](${imageUrl})`;

    // Try to find the Material Design text field's internal textarea
    const mdTextField = document.querySelector('md-outlined-text-field[label="Content (Markdown)"]') as any;
    let textarea: HTMLTextAreaElement | null = null;

    if (mdTextField) {
      // Look for the textarea inside the shadow DOM or as a child
      textarea = mdTextField.querySelector('textarea') ||
        mdTextField.shadowRoot?.querySelector('textarea') ||
        mdTextField.renderRoot?.querySelector('textarea');
    }

    if (textarea) {
      const cursorPosition = textarea.selectionStart || 0;
      const currentContent = formData.content;

      const newContent =
        currentContent.slice(0, cursorPosition) +
        imageMarkdown +
        currentContent.slice(cursorPosition);

      // Update content
      setFormData(prev => ({
        ...prev,
        content: newContent,
        images: [...prev.images, imageUrl].filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicates
      }));

      // Set cursor position after the inserted image
      setTimeout(() => {
        textarea!.focus();
        textarea!.setSelectionRange(
          cursorPosition + imageMarkdown.length,
          cursorPosition + imageMarkdown.length
        );
      }, 0);
    } else {
      // Fallback: insert at the end with proper spacing
      const currentContent = formData.content;
      const separator = currentContent && !currentContent.endsWith('\n') ? '\n\n' : '\n';

      setFormData(prev => ({
        ...prev,
        content: prev.content + separator + imageMarkdown,
        images: [...prev.images, imageUrl].filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicates
      }));

      // Show notification about where the image was inserted
      showNotification({
        type: 'info',
        title: 'Image Inserted',
        message: 'Image has been added to the end of your content.',
      });
    }
  };

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

        // Extract images from content
        const contentImages = extractImagesFromContent(post.content || '');

        setFormData({
          title: post.title,
          excerpt: post.excerpt,
          content: post.content || '',
          category: categoryId,
          tags: post.tags,
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

  const handleInputChange = (field: keyof PostFormData, value: any) => {
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

  const handleSelectExistingTag = (tagName: string) => {
    handleAddTag(tagName);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };





  // Content image upload function (simplified)
  const handleContentImageUpload = async (file: File): Promise<string | null> => {
    if (!file) return null;

    try {
      setIsUploadingImage(true);
      const result = await apiService.uploadPostImage(file);

      if (result.success && result.data?.file_url) {
        showNotification({
          type: 'success',
          title: 'Image Uploaded',
          message: 'Image has been uploaded successfully',
        });
        return apiService.getImageUrl(result.data.file_url);
      } else {
        throw new Error(result.error || 'Failed to upload image');
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



  // Handle drag and drop events for content area
  const handleContentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragged items contain files
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

    if (imageFiles.length === 0) {
      showNotification({
        type: 'warning',
        title: 'No Images Found',
        message: 'Please drop image files only.',
      });
      return;
    }

    // Upload and insert each image
    for (const file of imageFiles) {
      const imageUrl = await handleContentImageUpload(file);
      if (imageUrl) {
        insertImageIntoContent(imageUrl);
      }
    }
  };

  // Handle paste events for content area
  const handleContentPaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;

    // Check for files in clipboard
    const files = Array.from(clipboardData.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for images

      // Upload and insert each image
      for (const file of imageFiles) {
        const imageUrl = await handleContentImageUpload(file);
        if (imageUrl) {
          insertImageIntoContent(imageUrl);
        }
      }
      return;
    }

    // Check for image data in clipboard (e.g., from screenshots)
    const items = Array.from(clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for images

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

  // Check if form is valid for enabling save buttons
  const isFormValid = () => {
    return formData.title.trim() &&
      formData.content.trim() &&
      !isSaving;
  };



  const handleSave = async (status: 'draft' | 'published') => {
    try {
      setIsSaving(true);
      setError(null);

      // Extract current images from content to ensure images array is up to date
      const currentImages = extractImagesFromContent(formData.content);

      const postData = {
        title: formData.title.trim() || 'Untitled',
        excerpt: formData.excerpt.trim() || (formData.content.trim() ? formData.content.substring(0, 150) + '...' : 'No excerpt'),
        content: formData.content.trim() || '',
        category: formData.category,
        tags: formData.tags,
        featured: formData.featured,
        status,
        coverImage: formData.coverUrl, // Use coverImage field name expected by API
        author: 'Admin', // This should come from auth context
        publishDate: status === 'published' ? new Date().toISOString() : undefined,
        readTime: Math.ceil((formData.content || '').split(' ').length / 200), // Estimate reading time
        images: currentImages, // Include images array
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

  // Keyboard shortcuts
  const shortcuts = createCommonShortcuts({
    save: () => handleSave('draft'),
    publish: () => handleSave('published'),
    cancel: handleCancel,
    preview: () => setPreviewMode(!previewMode)
  });

  useKeyboardShortcuts(shortcuts, { enabled: !isSaving });

  // Simple title without complex breadcrumbs
  const pageTitle = isEditing ? 'Edit Post' : 'New Post';

  // Prepare header actions
  const headerActions = (
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
  );

  if (isLoading) {
    return (
      <AdminLayout title={pageTitle}>
        <div className="post-editor-loading">
          <md-circular-progress indeterminate></md-circular-progress>
          <p className="md-typescale-body-medium">Loading post...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={pageTitle}
      actions={headerActions}
    >
      <div className="post-editor">
        {error && (
          <div className="post-editor-error">
            <md-icon>error</md-icon>
            <span>{error}</span>
          </div>
        )}

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
              <CoverUpload
                value={formData.coverUrl}
                onChange={handleCoverChange}
                placeholder="Upload Cover Image"
                maxSize={10}
                supportPaste={true}
                supportDragDrop={true}
              />
            </div>
          </div>

          {/* Content */}
          <div className="form-section">
            <div className="content-header">
              <div className="content-title-section">
                <h2 className="md-typescale-headline-small">Content</h2>
                <p className="md-typescale-body-small content-hint">
                  Supports Markdown • Drag & drop images • Paste images from clipboard
                </p>
              </div>
              <div className="content-actions">
                <md-outlined-button
                  onClick={() => imageInputRef.current?.click()}
                >
                  <md-icon slot="icon">image</md-icon>
                  {isUploadingImage ? 'Uploading...' : 'Insert Image'}
                </md-outlined-button>

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
                  disabled={isUploadingImage}
                />

                <md-outlined-button
                  onClick={() => setPreviewMode(!previewMode)}
                  class={previewMode ? 'active' : ''}
                >
                  <md-icon slot="icon">{previewMode ? 'edit' : 'preview'}</md-icon>
                  {previewMode ? 'Edit' : 'Preview'}
                </md-outlined-button>
              </div>
            </div>



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
                <md-outlined-text-field
                  label="Content (Markdown)"
                  value={formData.content}
                  onInput={(e: any) => handleInputChange('content', e.target.value)}
                  onPaste={handleContentPaste}
                  type="textarea"
                  rows={20}
                  class="content-field"
                  ref={contentTextareaRef}
                ></md-outlined-text-field>
                {isDragOver && (
                  <div className="drag-overlay">
                    <div className="drag-overlay-content">
                      <md-icon class="drag-icon">image</md-icon>
                      <p className="md-typescale-body-large">Drop images here to upload</p>
                      <p className="md-typescale-body-medium">Images will be uploaded and inserted as markdown</p>
                    </div>
                  </div>
                )}
              </div>
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

            {/* Tags - Simplified */}
            <div className="tags-section">
              <div className="tags-input-container">

                {/* Current Tags */}
                {formData.tags.length > 0 && (
                  <div className="current-tags">
                    <div className="tags-list">
                      {formData.tags.map((tag, index) => (
                        <div key={index} className="current-tag-wrapper">
                          <md-assist-chip className="tag-chip current-tag-chip">
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

                {/* Quick Add Popular Tags */}
                {availableTags.length > 0 && (
                  <div className="popular-tags">
                    <div className="suggestions-header">Popular tags:</div>
                    <div className="suggestions-list">
                      {availableTags
                        .filter(tag => !formData.tags.includes(tag.name))
                        .slice(0, 8) // Show only first 8 popular tags
                        .map(tag => (
                          <md-assist-chip
                            key={tag.id}
                            className="available-chip"
                            onClick={() => handleSelectExistingTag(tag.name)}
                          >
                            <md-icon slot="icon">add</md-icon>
                            {tag.name}
                          </md-assist-chip>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PostEditor;
