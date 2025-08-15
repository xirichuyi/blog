// Post Management Component

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useData } from '../../contexts/DataContext';
import type { Article } from '../../types';
import AdminLayout from './AdminLayout';
import './PostManagement.css';

interface PostFilters {
  search: string;
  category: string;
  status: 'all' | 'published' | 'draft';
}

const PostManagement: React.FC = () => {
  const [posts, setPosts] = useState<Article[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PostFilters>({
    search: '',
    category: '',
    status: 'all',
  });
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { categories } = useData();

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [posts, filters]);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getPosts({
        status: filters.status,
        search: filters.search,
        category: filters.category,
      });

      if (response.success && response.data) {
        setPosts(response.data);
      } else {
        throw new Error(response.error || 'Failed to load posts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...posts];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (filters.category) {
      // Find the category name by ID
      const selectedCategory = categories.find(cat => cat.id === filters.category);
      if (selectedCategory) {
        filtered = filtered.filter(post => post.category === selectedCategory.name);
      }
    }

    setFilteredPosts(filtered);
  };

  const handleCreatePost = () => {
    navigate('/admin/posts/new');
  };

  const handleEditPost = (postId: string) => {
    navigate(`/admin/posts/edit/${postId}`);
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        const response = await apiService.deletePost(postId);
        if (response.success) {
          setPosts(posts.filter(post => post.id !== postId));
          // Remove from selected if it was selected
          const newSelected = new Set(selectedPosts);
          newSelected.delete(postId);
          setSelectedPosts(newSelected);

          // Show success notification
          showNotification({
            type: 'success',
            title: 'Post Deleted',
            message: 'The post has been deleted successfully.',
          });
        } else {
          throw new Error(response.error || 'Failed to delete post');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete post');
      }
    }
  };

  const handleSelectPost = (postId: string) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPosts.size === filteredPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(filteredPosts.map(post => post.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedPosts.size} posts?`)) {
      try {
        const response = await apiService.bulkDeletePosts(Array.from(selectedPosts));
        if (response.success) {
          const deletedCount = selectedPosts.size;
          setPosts(posts.filter(post => !selectedPosts.has(post.id)));
          setSelectedPosts(new Set());

          // Show success notification
          showNotification({
            type: 'success',
            title: 'Posts Deleted',
            message: `${deletedCount} post${deletedCount > 1 ? 's' : ''} deleted successfully.`,
          });
        } else {
          throw new Error(response.error || 'Failed to delete posts');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete posts');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Post Management">
        <div className="post-management-loading">
          <md-circular-progress indeterminate></md-circular-progress>
          <p className="md-typescale-body-medium">Loading posts...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Post Management">
        <div className="post-management-error">
          <md-icon class="error-icon">error</md-icon>
          <h2 className="md-typescale-headline-small">Error Loading Posts</h2>
          <p className="md-typescale-body-medium">{error}</p>
          <md-filled-button onClick={loadPosts}>
            <md-icon slot="icon">refresh</md-icon>
            Retry
          </md-filled-button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Post Management">
      <div className="post-management">
        {/* Header Actions */}
        <div className="post-header">
          <div className="post-header-title">
            <h1 className="md-typescale-display-small">Posts</h1>
            <p className="md-typescale-body-large">
              Manage your blog posts and content
            </p>
          </div>
          <div className="post-header-actions">
            <md-filled-button onClick={handleCreatePost}>
              <md-icon slot="icon">add</md-icon>
              New Post
            </md-filled-button>
          </div>
        </div>

        {/* Filters */}
        <div className="post-filters">
          <md-outlined-text-field
            label="Search posts..."
            value={filters.search}
            onInput={(e: any) => setFilters({ ...filters, search: e.target.value })}
            class="search-field"
          >
            <md-icon slot="leading-icon">search</md-icon>
          </md-outlined-text-field>

          <md-outlined-select
            label="Category"
            value={filters.category}
            onInput={(e: any) => setFilters({ ...filters, category: e.target.value })}
          >
            <md-select-option value="">All Categories</md-select-option>
            {categories
              .filter(cat => cat.id !== 'all') // Exclude "All Articles" category
              .map((category) => (
                <md-select-option key={category.id} value={category.id}>
                  {category.name}
                </md-select-option>
              ))}
          </md-outlined-select>

          <md-outlined-select
            label="Status"
            value={filters.status}
            onInput={(e: any) => setFilters({ ...filters, status: e.target.value })}
          >
            <md-select-option value="all">All Posts</md-select-option>
            <md-select-option value="published">Published</md-select-option>
            <md-select-option value="draft">Draft</md-select-option>
          </md-outlined-select>
        </div>

        {/* Bulk Actions */}
        {selectedPosts.size > 0 && (
          <div className="bulk-actions">
            <span className="md-typescale-body-medium">
              {selectedPosts.size} post{selectedPosts.size > 1 ? 's' : ''} selected
            </span>
            <md-text-button onClick={handleBulkDelete}>
              <md-icon slot="icon">delete</md-icon>
              Delete Selected
            </md-text-button>
          </div>
        )}

        {/* Posts Table */}
        <div className="posts-table-container">
          <table className="posts-table">
            <thead>
              <tr>
                <th>
                  <md-checkbox
                    checked={selectedPosts.size === filteredPosts.length && filteredPosts.length > 0}
                    indeterminate={selectedPosts.size > 0 && selectedPosts.size < filteredPosts.length}
                    onChange={handleSelectAll}
                  ></md-checkbox>
                </th>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <tr key={post.id} className={selectedPosts.has(post.id) ? 'selected' : ''}>
                  <td>
                    <md-checkbox
                      checked={selectedPosts.has(post.id)}
                      onChange={() => handleSelectPost(post.id)}
                    ></md-checkbox>
                  </td>
                  <td>
                    <div className="post-title-cell">
                      <h3 className="md-typescale-title-medium">{post.title}</h3>
                      <p className="md-typescale-body-small">{post.excerpt}</p>
                      {post.featured && (
                        <md-assist-chip class="featured-chip">
                          <md-icon slot="icon">star</md-icon>
                          Featured
                        </md-assist-chip>
                      )}
                    </div>
                  </td>
                  <td>
                    <md-assist-chip>{post.category}</md-assist-chip>
                  </td>
                  <td className="md-typescale-body-medium">
                    {formatDate(post.publishDate)}
                  </td>
                  <td>
                    <md-assist-chip class="status-published">
                      Published
                    </md-assist-chip>
                  </td>
                  <td>
                    <div className="post-actions">
                      <md-icon-button onClick={() => handleEditPost(post.id)}>
                        <md-icon>edit</md-icon>
                      </md-icon-button>
                      <md-icon-button onClick={() => handleDeletePost(post.id)}>
                        <md-icon>delete</md-icon>
                      </md-icon-button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPosts.length === 0 && (
          <div className="empty-state">
            <md-icon class="empty-icon">article</md-icon>
            <h3 className="md-typescale-headline-small">No posts found</h3>
            <p className="md-typescale-body-medium">
              {filters.search || filters.category
                ? 'Try adjusting your filters'
                : 'Create your first post to get started'}
            </p>
            {!filters.search && !filters.category && (
              <md-filled-button onClick={handleCreatePost}>
                <md-icon slot="icon">add</md-icon>
                Create Post
              </md-filled-button>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PostManagement;
