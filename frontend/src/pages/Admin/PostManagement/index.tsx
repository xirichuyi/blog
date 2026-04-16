// Post Management Component with Ant Design ProTable

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../../services/api';
import { logger } from '../../../utils/logger';
import { useNotification } from '../../../contexts/NotificationContext';
import type { Article, Category } from '../../../services/types';
import AdminLayout from '../../../components/adminLayout/AdminLayout';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  Button,
  Space,
  Tag,
  Modal,
  Typography,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarFilled,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import './style.css';

const { Text, Paragraph } = Typography;

const PostManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const actionRef = useRef<ActionType>();

  // Load categories for filter
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiService.getCategories();
        if (response.success && response.data) {
          setCategories(response.data.filter(cat => cat.id !== 'all'));
        }
      } catch (error) {
        logger.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  const handleCreatePost = () => {
    navigate('/admin/posts/new');
  };

  const handleEditPost = (record: Article) => {
    navigate(`/admin/posts/edit/${record.id}`);
  };

  const handleDeletePost = async (record: Article) => {
    try {
      const response = await apiService.deletePost(record.id);
      if (response.success) {
        message.success('Post deleted successfully');
        actionRef.current?.reload();
      } else {
        throw new Error(response.error || 'Failed to delete post');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select posts to delete');
      return;
    }

    Modal.confirm({
      title: 'Delete Posts',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete ${selectedRowKeys.length} posts? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          let successCount = 0;
          for (const id of selectedRowKeys) {
            const response = await apiService.deletePost(String(id));
            if (response.success) {
              successCount++;
            }
          }
          message.success(`${successCount} posts deleted successfully`);
          setSelectedRowKeys([]);
          actionRef.current?.reload();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to delete posts');
        }
      },
    });
  };

  const columns: ProColumns<Article>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: '40%',
      ellipsis: true,
      render: (_, record) => (
        <div>
          <Space>
            <Text strong style={{ fontSize: 14 }}>{record.title}</Text>
            {record.featured && (
              <Tooltip title="Featured">
                <StarFilled style={{ color: '#faad14' }} />
              </Tooltip>
            )}
          </Space>
          {record.excerpt && (
            <Paragraph
              type="secondary"
              ellipsis={{ rows: 1 }}
              style={{ marginBottom: 0, fontSize: 12 }}
            >
              {record.excerpt}
            </Paragraph>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: true,
      valueType: 'select',
      valueEnum: categories.reduce((acc, cat) => {
        acc[cat.name] = { text: cat.name };
        return acc;
      }, {} as Record<string, { text: string }>),
      render: (_, record) => (
        <Tag color="blue">{record.category}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: true,
      valueType: 'select',
      valueEnum: {
        published: { text: 'Published', status: 'Success' },
        draft: { text: 'Draft', status: 'Default' },
        private: { text: 'Private', status: 'Warning' },
      },
      render: (_, record) => {
        const status = record.status || 'draft';
        const colorMap: Record<string, string> = {
          published: 'success',
          draft: 'default',
          private: 'warning',
        };
        return <Tag color={colorMap[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'publishDate',
      key: 'publishDate',
      width: 120,
      sorter: true,
      valueType: 'date',
      render: (_, record) => (
        <Text type="secondary">
          {new Date(record.publishDate).toLocaleDateString('zh-CN')}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      valueType: 'option',
      render: (_, record) => [
        <Tooltip title="Edit" key="edit">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditPost(record)}
          />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="Delete Post"
          description={`Are you sure you want to delete "${record.title}"?`}
          onConfirm={() => handleDeletePost(record)}
          okText="Delete"
          okType="danger"
          cancelText="Cancel"
        >
          <Tooltip title="Delete">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <AdminLayout title="Post Management">
      <ProTable<Article>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        cardBordered
        request={async (params, sort) => {
          const { current, pageSize, title, category, status } = params;

          const apiParams: any = {
            page: current,
            page_size: pageSize,
          };

          if (title) {
            apiParams.search = title;
          }

          if (category) {
            apiParams.category = category;
          }

          if (status) {
            apiParams.status = status;
          }

          // Handle sorting
          if (sort && Object.keys(sort).length > 0) {
            const sortKey = Object.keys(sort)[0];
            apiParams.sort_by = sortKey;
            apiParams.sort_order = sort[sortKey] === 'ascend' ? 'asc' : 'desc';
          }

          try {
            const response = await apiService.getPosts(apiParams);

            if (response.success && response.data) {
              return {
                data: response.data,
                success: true,
                total: response.total || response.data.length,
              };
            }

            return {
              data: [],
              success: false,
              total: 0,
            };
          } catch (error) {
            message.error('Failed to load posts');
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        tableAlertRender={({ selectedRowKeys }) => (
          <Space>
            <span>Selected {selectedRowKeys.length} items</span>
          </Space>
        )}
        tableAlertOptionRender={() => (
          <Button danger onClick={handleBulkDelete}>
            Delete Selected
          </Button>
        )}
        toolbar={{
          title: 'Posts',
          subTitle: 'Manage your blog posts and content',
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreatePost}
          >
            New Post
          </Button>,
        ]}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: [10, 20, 50, 100],
        }}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        options={{
          density: true,
          fullScreen: true,
          reload: true,
          setting: true,
        }}
        dateFormatter="string"
        headerTitle={false}
      />
    </AdminLayout>
  );
};

export default PostManagement;
