// Admin Dashboard Component with Ant Design

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../../services/api';
import { logger } from '../../../utils/logger';
import type { DashboardStats } from '../../../services/types';
import AdminLayout from '../../../components/adminLayout/AdminLayout';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  List,
  Typography,
  Space,
  Spin,
  Result,
  Tag,
} from 'antd';
import {
  FileTextOutlined,
  FolderOutlined,
  TagsOutlined,
  EyeOutlined,
  PlusOutlined,
  EditOutlined,
  AppstoreOutlined,
  CustomerServiceOutlined,
  ArrowUpOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  HddOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import './style.css';

const { Title, Text, Paragraph } = Typography;

interface StatCardData {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getDashboardStats();

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        // If dashboard stats API fails, show error
        setError(response.error || 'Failed to load dashboard stats');
      }
    } catch (err) {
      logger.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatCards = (): StatCardData[] => {
    if (!stats) return [];

    return [
      {
        title: 'Total Posts',
        value: stats.total_posts,
        icon: <FileTextOutlined />,
        color: '#1890ff',
        trend: stats.total_posts > 0 ? 12 : undefined
      },
      {
        title: 'Categories',
        value: stats.total_categories,
        icon: <FolderOutlined />,
        color: '#52c41a',
        trend: stats.total_categories > 0 ? 5 : undefined
      },
      {
        title: 'Tags',
        value: stats.total_tags,
        icon: <TagsOutlined />,
        color: '#722ed1',
        trend: stats.total_tags > 0 ? 8 : undefined
      },
      {
        title: 'Total Views',
        value: stats.total_views || 'N/A',
        icon: <EyeOutlined />,
        color: '#fa541c',
        trend: stats.total_views && stats.total_views > 0 ? 15 : undefined
      }
    ];
  };

  const getQuickActions = (): QuickAction[] => [
    {
      title: 'New Post',
      description: 'Create a new blog post',
      icon: <PlusOutlined />,
      action: () => navigate('/admin/posts/new'),
      color: '#1890ff'
    },
    {
      title: 'Manage Posts',
      description: 'View and edit existing posts',
      icon: <EditOutlined />,
      action: () => navigate('/admin/posts'),
      color: '#52c41a'
    },
    {
      title: 'Categories & Tags',
      description: 'Organize content categories and tags',
      icon: <AppstoreOutlined />,
      action: () => navigate('/admin/categories-tags'),
      color: '#722ed1'
    },
    {
      title: 'Music Library',
      description: 'Manage music collection',
      icon: <CustomerServiceOutlined />,
      action: () => navigate('/admin/music'),
      color: '#fa541c'
    }
  ];

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="dashboard-loading">
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>Loading dashboard...</Text>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <Result
          status="error"
          title="Failed to Load Dashboard"
          subTitle={error}
          extra={
            <Button type="primary" icon={<ReloadOutlined />} onClick={loadDashboardData}>
              Retry
            </Button>
          }
        />
      </AdminLayout>
    );
  }

  const statCards = getStatCards();
  const quickActions = getQuickActions();

  return (
    <AdminLayout title="Dashboard">
      <div className="dashboard">
        {/* Welcome Section */}
        <div className="dashboard-header">
          <Title level={2} style={{ margin: 0 }}>Welcome back!</Title>
          <Paragraph type="secondary" style={{ margin: '8px 0 0 0' }}>
            Here's what's happening with your blog.
          </Paragraph>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          {statCards.map((card, index) => (
            <Col xs={12} sm={12} md={6} key={index}>
              <Card className="stat-card" hoverable>
                <Statistic
                  title={card.title}
                  value={card.value}
                  prefix={
                    <span style={{ color: card.color, fontSize: 24 }}>
                      {card.icon}
                    </span>
                  }
                  suffix={
                    card.trend && (
                      <span style={{ fontSize: 14, color: '#52c41a' }}>
                        <ArrowUpOutlined /> {card.trend}%
                      </span>
                    )
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Quick Actions */}
        <Card title="Quick Actions" style={{ marginTop: 24 }} className="admin-card">
          <Row gutter={[16, 16]}>
            {quickActions.map((action, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <Card
                  hoverable
                  className="action-card"
                  onClick={action.action}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div
                      className="action-icon"
                      style={{ color: action.color, fontSize: 32 }}
                    >
                      {action.icon}
                    </div>
                    <Text strong>{action.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {action.description}
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Recent Posts */}
        {stats && stats.recent_posts && stats.recent_posts.length > 0 && (
          <Card
            title="Recent Posts"
            extra={
              <Button type="link" onClick={() => navigate('/admin/posts')}>
                View All <ArrowRightOutlined />
              </Button>
            }
            style={{ marginTop: 24 }}
            className="admin-card"
          >
            <List
              dataSource={stats.recent_posts.slice(0, 5)}
              renderItem={(post: any) => (
                <List.Item
                  actions={[
                    <Button
                      key="edit"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/admin/posts/edit/${post.id}`)}
                    >
                      Edit
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={post.title}
                    description={
                      <Space>
                        <Tag color={post.status === 1 ? 'green' : 'orange'}>
                          {post.status === 1 ? 'Published' : 'Draft'}
                        </Tag>
                        <Text type="secondary">
                          {new Date(post.created_at).toLocaleDateString()}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* System Info */}
        {stats && stats.system_info && (
          <Card title="System Information" style={{ marginTop: 24 }} className="admin-card">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Space>
                  <ClockCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                  <div>
                    <Text type="secondary">Uptime</Text>
                    <div><Text strong>{stats.system_info.uptime}</Text></div>
                  </div>
                </Space>
              </Col>
              <Col xs={12} sm={6}>
                <Space>
                  <DatabaseOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                  <div>
                    <Text type="secondary">Memory</Text>
                    <div><Text strong>{stats.system_info.memory_usage}</Text></div>
                  </div>
                </Space>
              </Col>
              <Col xs={12} sm={6}>
                <Space>
                  <HddOutlined style={{ fontSize: 20, color: '#722ed1' }} />
                  <div>
                    <Text type="secondary">Disk</Text>
                    <div><Text strong>{stats.system_info.disk_usage}</Text></div>
                  </div>
                </Space>
              </Col>
              <Col xs={12} sm={6}>
                <Space>
                  <InfoCircleOutlined style={{ fontSize: 20, color: '#fa541c' }} />
                  <div>
                    <Text type="secondary">Status</Text>
                    <div><Tag color="success">Running</Tag></div>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
