// Post Management Component

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import { useData } from '../../../contexts/DataContext';
import type { Article } from '../../../types';
import AdminLayout from '../../../components/admin/AdminLayout';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import EnhancedDataTable from '../../../components/ui/EnhancedDataTable';
import type { TableColumn, TableAction, BulkAction } from '../../../components/ui/EnhancedDataTable';
import { showConfirmDialog } from '../../../components/ui/ConfirmDialog';
import './style.css';

interface PostFilters {
  search: string;
  category: string;
  status: 'all' | 'published' | 'draft';
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

interface SortState {
  key: string | null;
  direction: 'asc' | 'desc' | null;
}

const PostManagement: React.FC = () => {
  const [posts, setPosts] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PostFilters>({
    search: '',
    category: '',
    status: 'all',
  });
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [sortState, setSortState] = useState<SortState>({
    key: null,
    direction: null,
  });
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { categories } = useData();

  useEffect(() => {
    loadPosts();
  }, [pagination.current, pagination.pageSize, filters, sortState]);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build API parameters
      const params: any = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      if (filters.search) {
        params.search = filters.search;
      }

      if (filters.category) {
        params.category = filters.category;
      }

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      if (sortState.key && sortState.direction) {
        params.sort_by = sortState.key;
        params.sort_order = sortState.direction;
      }

      const response = await apiService.getPosts(params);

      if (response.success && response.data) {
        setPosts(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.total || response.data?.length || 0,
        }));
      } else {
        throw new Error(response.error || 'Failed to load posts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  // Event handlers (defined before useMemo to avoid hoisting issues)
  const handleCreatePost = () => {
    navigate('/admin/posts/new');
  };

  const handleDeletePost = async (post: Article) => {
    const confirmed = await showConfirmDialog({
      title: 'Delete Post',
      message: `Are you sure you want to delete "${post.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'error',
    });

    if (confirmed) {
      try {
        const response = await apiService.deletePost(post.id);
        if (response.success) {
          // Reload data to reflect changes
          loadPosts();

          showNotification({
            type: 'success',
            title: 'Post Deleted',
            message: 'Post deleted successfully.',
          });
        } else {
          throw new Error(response.error || 'Failed to delete post');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete post');
      }
    }
  };

  const handleBulkDelete = async (selectedPosts: Article[]) => {
    const confirmed = await showConfirmDialog({
      title: 'Delete Posts',
      message: `Are you sure you want to delete ${selectedPosts.length} posts? This action cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      type: 'error',
    });

    if (confirmed) {
      try {
        const postIds = selectedPosts.map(post => post.id);
        const response = await apiService.bulkDeletePosts(postIds);
        if (response.success) {
          // Reload data to reflect changes
          loadPosts();

          showNotification({
            type: 'success',
            title: 'Posts Deleted',
            message: `${selectedPosts.length} post${selectedPosts.length > 1 ? 's' : ''} deleted successfully.`,
          });
        } else {
          throw new Error(response.error || 'Failed to delete posts');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete posts');
      }
    }
  };

  // Table configuration
  const columns: TableColumn<Article>[] = useMemo(() => [
    {
      key: 'title',
      title: 'Title',
      sortable: true,
      render: (_, record) => (
        <div className="post-title-cell">
          <h3 className="md-typescale-title-medium">{record.title}</h3>
          <p className="md-typescale-body-small">{record.excerpt}</p>
          {record.featured && (
            <md-assist-chip class="featured-chip">
              <md-icon slot="icon">star</md-icon>
              Featured
            </md-assist-chip>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      sortable: true,
      render: (value) => (
        <md-assist-chip>{value}</md-assist-chip>
      ),
    },
    {
      key: 'publishDate',
      title: 'Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <md-assist-chip class={`status-${value || 'draft'}`}>
          {value === 'published' ? 'Published' :
            value === 'draft' ? 'Draft' :
              value === 'private' ? 'Private' : 'Draft'}
        </md-assist-chip>
      ),
    },
  ], []);

  const actions: TableAction<Article>[] = useMemo(() => [
    {
      key: 'edit',
      label: 'Edit',
      icon: 'edit',
      onClick: (record) => navigate(`/admin/posts/edit/${record.id}`),
      color: 'primary',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'delete',
      onClick: handleDeletePost,
      color: 'error',
    },
  ], [navigate]);

  const bulkActions: BulkAction<Article>[] = useMemo(() => [
    {
      key: 'delete',
      label: 'Delete Selected',
      icon: 'delete',
      onClick: handleBulkDelete,
      color: 'error',
      confirmMessage: 'Are you sure you want to delete {count} posts?',
    },
  ], [handleBulkDelete]);

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize,
    }));
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortState({ key, direction });
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
        <ErrorMessage
          title="Error Loading Posts"
          message={error}
          onRetry={loadPosts}
        />
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

        {/* Enhanced Data Table */}
        <EnhancedDataTable
          data={posts}
          columns={columns}
          actions={actions}
          bulkActions={bulkActions}
          loading={isLoading}
          error={error || undefined}
          selectable={true}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            onPageChange: handlePageChange,
          }}
          onSort={handleSort}
          emptyState={{
            icon: 'article',
            title: 'No posts found',
            description: filters.search || filters.category
              ? 'Try adjusting your filters'
              : 'Create your first post to get started',
            action: !filters.search && !filters.category ? {
              label: 'Create Post',
              onClick: handleCreatePost,
            } : undefined,
          }}
          className="posts-table"
        />
      </div>
    </AdminLayout>
  );
};

export default PostManagement;
