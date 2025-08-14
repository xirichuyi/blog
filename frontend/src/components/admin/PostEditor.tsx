// Post Editor Component

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import type { Article } from '../../types';
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
}

const PostEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const isEditing = id !== 'new';
  
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: [],
    featured: false,
    status: 'draft',
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadPost(id);
    }
  }, [isEditing, id]);

  const loadPost = async (postId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Mock data for now
      const mockPost: Article = {
        id: postId,
        title: 'Sample Post Title',
        excerpt: 'This is a sample excerpt for the post',
        content: '# Sample Post\n\nThis is the content of the post written in **Markdown**.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3\n\n```javascript\nconsole.log("Hello, World!");\n```',
        author: 'Admin',
        publishDate: '2024-01-15',
        readTime: 5,
        category: 'React',
        tags: ['react', 'javascript', 'frontend'],
        featured: true,
      };
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFormData({
        title: mockPost.title,
        excerpt: mockPost.excerpt,
        content: mockPost.content || '',
        category: mockPost.category,
        tags: mockPost.tags,
        featured: mockPost.featured || false,
        status: 'published',
      });
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

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput('');
    }
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
              disabled={isSaving}
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
              disabled={isSaving}
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
          </div>

          {/* Content */}
          <div className="form-section">
            <div className="content-header">
              <h2 className="md-typescale-headline-small">Content</h2>
              <div className="content-actions">
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
                <div className="markdown-preview">
                  {formData.content || 'No content to preview'}
                </div>
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
                <md-select-option value="React">React</md-select-option>
                <md-select-option value="Rust">Rust</md-select-option>
                <md-select-option value="Design">Design</md-select-option>
                <md-select-option value="JavaScript">JavaScript</md-select-option>
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
              <div className="tags-input">
                <md-outlined-text-field
                  label="Add tags"
                  value={tagInput}
                  onInput={(e: any) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  class="tag-input-field"
                >
                  <md-icon-button slot="trailing-icon" onClick={handleAddTag}>
                    <md-icon>add</md-icon>
                  </md-icon-button>
                </md-outlined-text-field>
              </div>
              
              <div className="tags-list">
                {formData.tags.map((tag, index) => (
                  <md-assist-chip key={index} class="tag-chip">
                    {tag}
                    <md-icon 
                      slot="trailing-icon" 
                      onClick={() => handleRemoveTag(tag)}
                    >
                      close
                    </md-icon>
                  </md-assist-chip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PostEditor;
