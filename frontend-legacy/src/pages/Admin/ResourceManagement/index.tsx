// Resource Management Component with Ant Design ProTable

import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../../services/api';
import { API_BASE_URL } from '../../../services/api/base';
import type { StaticResource, ResourceStats } from '../../../services/api';
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
  Card,
  Row,
  Col,
  Statistic,
  Image,
  Progress,
} from 'antd';
import {
  DeleteOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  CustomerServiceOutlined,
  FileOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  LinkOutlined,
  CopyOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  PictureOutlined,
  HddOutlined,
} from '@ant-design/icons';
import './style.css';

const { Text, Paragraph } = Typography;

const ResourceManagement: React.FC = () => {
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const actionRef = useRef<ActionType>();

  // Load resource stats
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const response = await apiService.getResourceStats();
      if (response.success && response.data) {
        // Backend wraps data in { code, message, data } structure
        const statsData = (response.data as any).data || response.data;
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading resource stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatBytes = (bytes: number | undefined): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0 || i >= sizes.length) return '0 B';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <FileImageOutlined style={{ color: '#1890ff' }} />;
      case 'cover':
        return <PictureOutlined style={{ color: '#52c41a' }} />;
      case 'music':
        return <CustomerServiceOutlined style={{ color: '#722ed1' }} />;
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#fa541c' }} />;
      default:
        return <FileOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const handleDeleteResource = async (record: StaticResource) => {
    try {
      const response = await apiService.deleteResource(record.path);
      if (response.success) {
        message.success('Resource deleted successfully');
        actionRef.current?.reload();
        loadStats();
      } else {
        throw new Error(response.error || 'Failed to delete resource');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to delete resource');
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select resources to delete');
      return;
    }

    Modal.confirm({
      title: 'Delete Resources',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete ${selectedRowKeys.length} resources? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          let successCount = 0;
          for (const path of selectedRowKeys) {
            const response = await apiService.deleteResource(path as string);
            if (response.success) {
              successCount++;
            }
          }
          message.success(`${successCount} resources deleted successfully`);
          setSelectedRowKeys([]);
          actionRef.current?.reload();
          loadStats();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to delete resources');
        }
      },
    });
  };

  const handleOptimizeAll = async () => {
    Modal.confirm({
      title: 'Optimize All Images',
      icon: <ThunderboltOutlined />,
      content: 'This will convert all existing images to WebP format with optimized dimensions. This process may take a while.',
      okText: 'Start Optimization',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setOptimizing(true);
          const response = await apiService.optimizeAllImages();
          if (response.success && response.data) {
            const result = response.data;
            const savedSize = result.original_size - result.optimized_size;
            const savedPercent = result.original_size > 0
              ? ((savedSize / result.original_size) * 100).toFixed(1)
              : 0;

            Modal.success({
              title: 'Optimization Complete',
              content: (
                <div>
                  <p>Converted: {result.converted} images</p>
                  <p>Skipped: {result.skipped} images</p>
                  <p>Failed: {result.failed} images</p>
                  <p>Space saved: {formatBytes(savedSize)} ({savedPercent}%)</p>
                </div>
              ),
            });
            actionRef.current?.reload();
            loadStats();
          } else {
            throw new Error(response.error || 'Failed to optimize images');
          }
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to optimize images');
        } finally {
          setOptimizing(false);
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Link copied to clipboard');
  };

  // Get full URL for resources
  const getFullUrl = (path: string): string => {
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  const columns: ProColumns<StaticResource>[] = [
    {
      title: 'Preview',
      dataIndex: 'full_url',
      key: 'preview',
      width: 80,
      search: false,
      render: (_, record) => {
        if (record.file_type === 'image' || record.file_type === 'cover') {
          return (
            <Image
              src={getFullUrl(record.full_url)}
              alt={record.file_name}
              width={60}
              height={60}
              style={{ objectFit: 'cover', borderRadius: 4 }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
          );
        }
        return (
          <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 4 }}>
            {getFileTypeIcon(record.file_type)}
          </div>
        );
      },
    },
    {
      title: 'File Name',
      dataIndex: 'file_name',
      key: 'file_name',
      width: '25%',
      ellipsis: true,
      copyable: true,
      render: (_, record) => (
        <div>
          <Space>
            {getFileTypeIcon(record.file_type)}
            <Text strong style={{ fontSize: 13 }}>{record.file_name}</Text>
          </Space>
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 1 }}
            style={{ marginBottom: 0, fontSize: 11 }}
          >
            {record.path}
          </Paragraph>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 100,
      filters: true,
      valueType: 'select',
      valueEnum: {
        image: { text: 'Image' },
        cover: { text: 'Cover' },
        music: { text: 'Music' },
        music_cover: { text: 'Music Cover' },
        pdf: { text: 'PDF' },
        download: { text: 'Download' },
      },
      render: (_, record) => {
        const colorMap: Record<string, string> = {
          image: 'blue',
          cover: 'green',
          music: 'purple',
          music_cover: 'magenta',
          pdf: 'orange',
          download: 'cyan',
        };
        return <Tag color={colorMap[record.file_type] || 'default'}>{record.file_type}</Tag>;
      },
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      sorter: true,
      search: false,
      render: (_, record) => (
        <Text type="secondary">{formatBytes(record.file_size)}</Text>
      ),
    },
    {
      title: 'Usage',
      dataIndex: ['usage', 'is_used'],
      key: 'is_used',
      width: 120,
      filters: true,
      valueType: 'select',
      valueEnum: {
        true: { text: 'Used', status: 'Success' },
        false: { text: 'Unused', status: 'Warning' },
      },
      render: (_, record) => {
        if (record.usage.is_used) {
          return (
            <Tooltip
              title={
                <div>
                  {record.usage.used_by.map((ref, i) => (
                    <div key={i}>{ref.ref_type}: {ref.ref_title}</div>
                  ))}
                </div>
              }
            >
              <Tag icon={<CheckCircleOutlined />} color="success">
                Used ({record.usage.used_by.length})
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Tag icon={<WarningOutlined />} color="warning">
            Unused
          </Tag>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: true,
      valueType: 'date',
      search: false,
      render: (_, record) => (
        <Text type="secondary">
          {new Date(record.created_at).toLocaleDateString('zh-CN')}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      valueType: 'option',
      render: (_, record) => [
        <Tooltip title="Copy Link" key="copy">
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(getFullUrl(record.full_url))}
          />
        </Tooltip>,
        <Tooltip title="Open in new tab" key="open">
          <Button
            type="text"
            icon={<LinkOutlined />}
            onClick={() => window.open(getFullUrl(record.full_url), '_blank')}
          />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="Delete Resource"
          description={
            record.usage.is_used
              ? `This resource is used by ${record.usage.used_by.length} item(s). Are you sure?`
              : `Are you sure you want to delete "${record.file_name}"?`
          }
          onConfirm={() => handleDeleteResource(record)}
          okText="Delete"
          okType="danger"
          cancelText="Cancel"
        >
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>,
      ],
    },
  ];

  const usedPercent = stats && stats.total_count > 0
    ? Math.round(((stats.total_count - stats.unused_count) / stats.total_count) * 100)
    : 0;

  return (
    <AdminLayout title="Resource Management">
      <div className="resource-management">
        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card loading={statsLoading}>
              <Statistic
                title="Total Resources"
                value={stats?.total_count || 0}
                prefix={<FileOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card loading={statsLoading}>
              <Statistic
                title="Total Size"
                value={stats ? formatBytes(stats.total_size) : '0 B'}
                prefix={<HddOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card loading={statsLoading}>
              <Statistic
                title="Unused Resources"
                value={stats?.unused_count || 0}
                valueStyle={{ color: (stats?.unused_count || 0) > 0 ? '#faad14' : '#52c41a' }}
                prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card loading={statsLoading}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Usage Rate</Text>
              </div>
              <Progress
                percent={usedPercent}
                status={usedPercent > 80 ? 'success' : 'normal'}
                format={(percent) => `${percent}%`}
              />
            </Card>
          </Col>
        </Row>

        {/* Type Breakdown */}
        {stats && stats.by_type && (
          <Card title="Resources by Type" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={[16, 8]}>
              {Object.entries(stats.by_type).map(([type, data]) => (
                <Col xs={12} sm={8} md={4} key={type}>
                  <Space direction="vertical" size={0}>
                    <Space>
                      {getFileTypeIcon(type)}
                      <Text strong style={{ textTransform: 'capitalize' }}>{type}</Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {data.count} files / {formatBytes(data.size)}
                    </Text>
                  </Space>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* Resources Table */}
        <ProTable<StaticResource>
          actionRef={actionRef}
          columns={columns}
          rowKey="path"
          cardBordered
          request={async (params) => {
            const { file_type, is_used } = params;

            try {
              const response = await apiService.listResources(
                file_type,
                is_used !== undefined ? is_used === 'true' : undefined
              );

              if (response.success && response.data) {
                // Backend wraps data in { code, message, data } structure
                const resourceData = (response.data as any).data || response.data;
                const resources = Array.isArray(resourceData) ? resourceData : [];
                return {
                  data: resources,
                  success: true,
                  total: resources.length,
                };
              }

              return {
                data: [],
                success: false,
                total: 0,
              };
            } catch (error) {
              message.error('Failed to load resources');
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
            title: 'Static Resources',
            subTitle: 'Manage uploaded files and images',
          }}
          toolBarRender={() => [
            <Button
              key="optimize"
              icon={<ThunderboltOutlined />}
              loading={optimizing}
              onClick={handleOptimizeAll}
            >
              Optimize Images
            </Button>,
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={() => {
                actionRef.current?.reload();
                loadStats();
              }}
            >
              Refresh
            </Button>,
          ]}
          pagination={{
            defaultPageSize: 20,
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
      </div>
    </AdminLayout>
  );
};

export default ResourceManagement;
