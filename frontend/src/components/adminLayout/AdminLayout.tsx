// Admin Layout Component with Ant Design ProLayout

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProLayout, PageContainer } from '@ant-design/pro-components';
import { Button, Dropdown, Avatar, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  TagsOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import './AdminLayout.css';

const { Text } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; path?: string }[];
  actions?: React.ReactNode;
}

const menuItems = [
  {
    path: '/admin/dashboard',
    name: 'Dashboard',
    icon: <DashboardOutlined />,
  },
  {
    path: '/admin/posts',
    name: 'Posts',
    icon: <FileTextOutlined />,
  },
  {
    path: '/admin/categories-tags',
    name: 'Categories & Tags',
    icon: <TagsOutlined />,
  },
  {
    path: '/admin/about',
    name: 'About',
    icon: <UserOutlined />,
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = 'Admin Dashboard',
  actions
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <ProLayout
      title="Admin Panel"
      logo={null}
      layout="mix"
      splitMenus={false}
      collapsed={collapsed}
      onCollapse={setCollapsed}
      location={{ pathname: location.pathname }}
      route={{
        path: '/admin',
        routes: menuItems,
      }}
      menuItemRender={(item, dom) => (
        <div onClick={() => navigate(item.path || '/admin')}>
          {dom}
        </div>
      )}
      actionsRender={() => [
        <Button
          key="notifications"
          type="text"
          icon={<BellOutlined />}
          style={{ color: 'inherit' }}
        />,
        <Dropdown
          key="user"
          menu={{ items: userMenuItems }}
          placement="bottomRight"
        >
          <Space style={{ cursor: 'pointer', marginLeft: 8 }}>
            <Avatar icon={<UserOutlined />} size="small" />
            <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
              <Text strong style={{ fontSize: 14 }}>{user?.username}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{user?.role}</Text>
            </Space>
          </Space>
        </Dropdown>,
      ]}
      headerTitleRender={() => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />
          <span style={{ fontWeight: 600, fontSize: 18 }}>Admin Panel</span>
        </div>
      )}
      token={{
        header: {
          colorBgHeader: '#fff',
          colorHeaderTitle: '#1f1f1f',
          colorTextMenu: '#595959',
          colorTextMenuSecondary: '#595959',
          colorTextMenuSelected: '#1890ff',
          colorBgMenuItemSelected: 'rgba(24, 144, 255, 0.1)',
          colorTextMenuActive: '#1890ff',
          colorTextRightActionsItem: '#595959',
        },
        sider: {
          colorMenuBackground: '#001529',
          colorMenuItemDivider: 'rgba(255,255,255,0.1)',
          colorTextMenu: 'rgba(255,255,255,0.65)',
          colorTextMenuSelected: '#fff',
          colorBgMenuItemSelected: '#1890ff',
          colorBgMenuItemHover: 'rgba(255,255,255,0.05)',
        },
      }}
      fixSiderbar
      fixedHeader
      contentStyle={{
        padding: 24,
        minHeight: 'calc(100vh - 56px)',
        background: '#f5f5f5',
      }}
    >
      <PageContainer
        title={title}
        extra={actions}
        header={{
          style: {
            padding: '16px 0',
            background: 'transparent',
          },
        }}
        style={{
          background: 'transparent',
        }}
      >
        {children}
      </PageContainer>
    </ProLayout>
  );
};

export default AdminLayout;
