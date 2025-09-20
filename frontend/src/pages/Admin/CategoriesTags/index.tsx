import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import AdminLayout from '../../../components/admin/AdminLayout';
import { apiService } from '../../../services/api';
import './style.css';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  count?: number;
  created_at: string;
  updated_at: string;
}

interface Tag {
  id: string;
  name: string;
  count?: number;
  created_at: string;
  updated_at: string;
}

interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
}

interface CreateTagRequest {
  name: string;
}

interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  icon?: string;
}

interface UpdateTagRequest {
  name?: string;
}

const CategoriesTagsManagement: React.FC = () => {
  const { showNotification } = useNotification();

  // State for categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CreateCategoryRequest>({
    name: '',
    description: '',
    icon: 'folder'
  });

  // State for tags
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagForm, setTagForm] = useState<CreateTagRequest>({
    name: ''
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');

  // Load data on component mount
  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  // Categories functions
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await apiService.getPublicCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      showNotification({
        type: 'error',
        title: 'Failed to load categories'
      });
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      showNotification({
        type: 'error',
        title: 'Category name is required'
      });
      return;
    }

    try {
      const response = await apiService.createCategory(categoryForm);
      if (response.success) {
        showNotification({
          type: 'success',
          title: 'Category created successfully'
        });
        setShowCategoryDialog(false);
        setCategoryForm({ name: '', description: '', icon: 'folder' });
        loadCategories();
      } else {
        showNotification({
          type: 'error',
          title: response.message || 'Failed to create category'
        });
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      showNotification({
        type: 'error',
        title: 'Failed to create category'
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryForm.name.trim()) {
      showNotification({
        type: 'error',
        title: 'Category name is required'
      });
      return;
    }

    try {
      const response = await apiService.updateCategory(editingCategory.id, categoryForm);
      if (response.success) {
        showNotification({
          type: 'success',
          title: 'Category updated successfully'
        });
        setShowCategoryDialog(false);
        setEditingCategory(null);
        setCategoryForm({ name: '', description: '', icon: 'folder' });
        loadCategories();
      } else {
        showNotification({
          type: 'error',
          title: response.message || 'Failed to update category'
        });
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      showNotification({
        type: 'error',
        title: 'Failed to update category'
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await apiService.deleteCategory(categoryId);
      if (response.success) {
        showNotification({
          type: 'success',
          title: 'Category deleted successfully'
        });
        loadCategories();
      } else {
        showNotification({
          type: 'error',
          title: response.message || 'Failed to delete category'
        });
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      showNotification({
        type: 'error',
        title: 'Failed to delete category'
      });
    }
  };

  // Tags functions
  const loadTags = async () => {
    setTagsLoading(true);
    try {
      const response = await apiService.getPublicTags();
      if (response.success && response.data) {
        setTags(response.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
      showNotification({
        type: 'error',
        title: 'Failed to load tags'
      });
    } finally {
      setTagsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!tagForm.name.trim()) {
      showNotification({
        type: 'error',
        title: 'Tag name is required'
      });
      return;
    }

    try {
      const response = await apiService.createTag(tagForm);
      if (response.success) {
        showNotification({
          type: 'success',
          title: 'Tag created successfully'
        });
        setShowTagDialog(false);
        setTagForm({ name: '' });
        loadTags();
      } else {
        showNotification({
          type: 'error',
          title: response.message || 'Failed to create tag'
        });
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
      showNotification({
        type: 'error',
        title: 'Failed to create tag'
      });
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !tagForm.name.trim()) {
      showNotification({
        type: 'error',
        title: 'Tag name is required'
      });
      return;
    }

    try {
      const response = await apiService.updateTag(editingTag.id, tagForm);
      if (response.success) {
        showNotification({
          type: 'success',
          title: 'Tag updated successfully'
        });
        setShowTagDialog(false);
        setEditingTag(null);
        setTagForm({ name: '' });
        loadTags();
      } else {
        showNotification({
          type: 'error',
          title: response.message || 'Failed to update tag'
        });
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
      showNotification({
        type: 'error',
        title: 'Failed to update tag'
      });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) {
      return;
    }

    try {
      const response = await apiService.deleteTag(tagId);
      if (response.success) {
        showNotification({
          type: 'success',
          title: 'Tag deleted successfully'
        });
        loadTags();
      } else {
        showNotification({
          type: 'error',
          title: response.message || 'Failed to delete tag'
        });
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      showNotification({
        type: 'error',
        title: 'Failed to delete tag'
      });
    }
  };

  // Dialog handlers
  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'folder'
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon: 'folder' });
    }
    setShowCategoryDialog(true);
  };

  const openTagDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setTagForm({ name: tag.name });
    } else {
      setEditingTag(null);
      setTagForm({ name: '' });
    }
    setShowTagDialog(true);
  };

  const closeCategoryDialog = () => {
    setShowCategoryDialog(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', icon: 'folder' });
  };

  const closeTagDialog = () => {
    setShowTagDialog(false);
    setEditingTag(null);
    setTagForm({ name: '' });
  };

  return (
    <AdminLayout title="Categories & Tags Management">
      <div className="categories-tags-management">
        {/* Header */}
        <div className="management-header">
          <h1 className="page-title md-typescale-headline-large">Categories & Tags Management</h1>
          <p className="page-description md-typescale-body-large">
            Manage your blog categories and tags. Create, edit, and organize your content taxonomy.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <md-tabs>
            <md-primary-tab
              active={activeTab === 'categories'}
              onClick={() => setActiveTab('categories')}
            >
              <md-icon slot="icon" style={{ fontSize: '40px', width: '40px', height: '40px', lineHeight: '40px' }}>folder</md-icon>
            </md-primary-tab>
            <md-primary-tab
              active={activeTab === 'tags'}
              onClick={() => setActiveTab('tags')}
            >
              <md-icon slot="icon" style={{ fontSize: '40px', width: '40px', height: '40px', lineHeight: '40px' }}>label</md-icon>
            </md-primary-tab>
          </md-tabs>
        </div>

        {/* Categories Tab Content */}
        {activeTab === 'categories' && (
          <div className="tab-content">
            <div className="content-header">
              <h2 className="section-title md-typescale-headline-medium">Categories</h2>
              <md-filled-button onClick={() => openCategoryDialog()}>
                <md-icon slot="icon">add</md-icon>
                Add Category
              </md-filled-button>
            </div>

            {categoriesLoading ? (
              <div className="loading-container">
                <md-circular-progress indeterminate></md-circular-progress>
                <span className="loading-text">Loading categories...</span>
              </div>
            ) : (
              <div className="categories-grid">
                {categories.map((category) => (
                  <md-elevated-card key={category.id} className="category-item">
                    <div className="category-content">
                      <div className="category-header">
                        <md-icon className="category-icon">{category.icon || 'folder'}</md-icon>
                        <div className="category-info">
                          <h3 className="category-name md-typescale-title-medium">{category.name}</h3>
                          <p className="category-description md-typescale-body-medium">
                            {category.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="category-actions">
                        <md-icon-button onClick={() => openCategoryDialog(category)}>
                          <md-icon>edit</md-icon>
                        </md-icon-button>
                        <md-icon-button onClick={() => handleDeleteCategory(category.id)}>
                          <md-icon>delete</md-icon>
                        </md-icon-button>
                      </div>
                    </div>
                  </md-elevated-card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags Tab Content */}
        {activeTab === 'tags' && (
          <div className="tab-content">
            <div className="content-header">
              <h2 className="section-title md-typescale-headline-medium">Tags</h2>
              <md-filled-button onClick={() => openTagDialog()}>
                <md-icon slot="icon">add</md-icon>
                Add Tag
              </md-filled-button>
            </div>

            {tagsLoading ? (
              <div className="loading-container">
                <md-circular-progress indeterminate></md-circular-progress>
                <span className="loading-text">Loading tags...</span>
              </div>
            ) : (
              <div className="tags-grid">
                {tags.map((tag) => (
                  <md-elevated-card key={tag.id} className="tag-item">
                    <div className="tag-content">
                      <div className="tag-header">
                        <md-icon className="tag-icon">label</md-icon>
                        <div className="tag-info">
                          <h3 className="tag-name md-typescale-title-medium">{tag.name}</h3>
                        </div>
                      </div>
                      <div className="tag-actions">
                        <md-icon-button onClick={() => openTagDialog(tag)}>
                          <md-icon>edit</md-icon>
                        </md-icon-button>
                        <md-icon-button onClick={() => handleDeleteTag(tag.id)}>
                          <md-icon>delete</md-icon>
                        </md-icon-button>
                      </div>
                    </div>
                  </md-elevated-card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Dialog */}
        {showCategoryDialog && (
          <md-dialog open={showCategoryDialog}>
            <div slot="headline">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </div>
            <form slot="content" className="dialog-form">
              <md-outlined-text-field
                label="Category Name"
                value={categoryForm.name}
                onInput={(e: any) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                required
              />
              <md-outlined-text-field
                label="Description"
                value={categoryForm.description}
                onInput={(e: any) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                type="textarea"
                rows={3}
              />
              <md-outlined-text-field
                label="Icon"
                value={categoryForm.icon}
                onInput={(e: any) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                supporting-text="Material Design icon name (e.g., folder, category, label)"
              />
            </form>
            <div slot="actions">
              <md-text-button onClick={closeCategoryDialog}>Cancel</md-text-button>
              <md-filled-button
                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
              >
                {editingCategory ? 'Update' : 'Create'}
              </md-filled-button>
            </div>
          </md-dialog>
        )}

        {/* Tag Dialog */}
        {showTagDialog && (
          <md-dialog open={showTagDialog}>
            <div slot="headline">
              {editingTag ? 'Edit Tag' : 'Create Tag'}
            </div>
            <form slot="content" className="dialog-form">
              <md-outlined-text-field
                label="Tag Name"
                value={tagForm.name}
                onInput={(e: any) => setTagForm({ ...tagForm, name: e.target.value })}
                required
              />
            </form>
            <div slot="actions">
              <md-text-button onClick={closeTagDialog}>Cancel</md-text-button>
              <md-filled-button
                onClick={editingTag ? handleUpdateTag : handleCreateTag}
              >
                {editingTag ? 'Update' : 'Create'}
              </md-filled-button>
            </div>
          </md-dialog>
        )}
      </div>
    </AdminLayout>
  );
};

export default CategoriesTagsManagement;
