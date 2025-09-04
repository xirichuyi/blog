// Admin Layout Component with Sidebar Navigation

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ShortcutsHelp from '../ui/ShortcutsHelp';
import { createCommonShortcuts } from '../../hooks/useKeyboardShortcuts';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; path?: string }[];
  actions?: React.ReactNode;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/admin/dashboard',
  },
  {
    id: 'posts',
    label: 'Posts',
    icon: 'article',
    path: '/admin/posts',
  },
  {
    id: 'categories-tags',
    label: 'Categories & Tags',
    icon: 'label',
    path: '/admin/categories-tags',
  },
  {
    id: 'about',
    label: 'About',
    icon: 'person',
    path: '/admin/about',
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = 'Admin Dashboard',
  breadcrumbs = [],
  actions
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="admin-layout">
      {/* Top App Bar */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-start">
            <md-icon-button onClick={toggleSidebar} className="sidebar-toggle">
              <md-icon>menu</md-icon>
            </md-icon-button>
            <div className="header-title-section">
              {breadcrumbs.length > 0 && (
                <nav className="breadcrumbs">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={index} className="breadcrumb-item">
                      {crumb.path ? (
                        <button
                          className="breadcrumb-link"
                          onClick={() => navigate(crumb.path!)}
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="breadcrumb-current">{crumb.label}</span>
                      )}
                      {index < breadcrumbs.length - 1 && (
                        <md-icon className="breadcrumb-separator">chevron_right</md-icon>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              <h1 className="admin-title md-typescale-headline-small">{title}</h1>
            </div>
          </div>

          <div className="admin-header-end">
            {actions && (
              <div className="header-actions">
                {actions}
              </div>
            )}

            <ShortcutsHelp
              shortcuts={createCommonShortcuts({
                newItem: () => navigate('/admin/posts/new'),
                search: () => { }, // Could implement global search
                refresh: () => window.location.reload()
              })}
            />

            <md-icon-button className="header-action">
              <md-icon>notifications</md-icon>
            </md-icon-button>

            <div className="user-menu">
              <md-icon-button className="user-avatar">
                <md-icon>account_circle</md-icon>
              </md-icon-button>
              <div className="user-info">
                <span className="user-name md-typescale-body-medium">{user?.username}</span>
                <span className="user-role md-typescale-body-small">{user?.role}</span>
              </div>
              <md-icon-button onClick={handleLogout} className="logout-button">
                <md-icon>logout</md-icon>
              </md-icon-button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <nav className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <md-icon class="brand-icon">admin_panel_settings</md-icon>
            <span className="brand-text md-typescale-title-medium">Admin Panel</span>
          </div>
        </div>

        <div className="sidebar-content">
          <md-list class="navigation-list">
            {navigationItems.map((item) => (
              <md-list-item
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                class={`nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
              >
                <md-icon slot="start">{item.icon}</md-icon>
                <div slot="headline" className="nav-label">{item.label}</div>
                {item.badge && (
                  <md-badge slot="end" value={item.badge}></md-badge>
                )}
              </md-list-item>
            ))}
          </md-list>
        </div>

        <div className="sidebar-footer">
          <md-divider></md-divider>
          <md-list-item onClick={handleLogout} class="logout-item">
            <md-icon slot="start">logout</md-icon>
            <div slot="headline">Logout</div>
          </md-list-item>
        </div>
      </nav>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
