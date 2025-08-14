// Admin Dashboard Component

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { DashboardStats } from '../../types';
import AdminLayout from './AdminLayout';
import './Dashboard.css';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
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
      
      // For now, use mock data since backend might not be ready
      const mockStats: DashboardStats = {
        totalPosts: 12,
        totalCategories: 5,
        totalViews: 1234,
        recentPosts: 3,
      };
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStats(mockStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Posts',
      value: stats?.totalPosts || 0,
      icon: 'article',
      color: 'primary',
      trend: { value: 12, isPositive: true },
    },
    {
      title: 'Categories',
      value: stats?.totalCategories || 0,
      icon: 'category',
      color: 'secondary',
    },
    {
      title: 'Total Views',
      value: stats?.totalViews || 0,
      icon: 'visibility',
      color: 'tertiary',
      trend: { value: 8, isPositive: true },
    },
    {
      title: 'Recent Posts',
      value: stats?.recentPosts || 0,
      icon: 'schedule',
      color: 'error',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Create New Post',
      description: 'Write and publish a new blog post',
      icon: 'add_circle',
      action: () => navigate('/admin/posts/new'),
      color: 'primary',
    },
    {
      title: 'Manage Posts',
      description: 'View and edit existing posts',
      icon: 'edit_note',
      action: () => navigate('/admin/posts'),
      color: 'secondary',
    },
    {
      title: 'Upload Music',
      description: 'Add new music to your collection',
      icon: 'library_add',
      action: () => navigate('/admin/music/upload'),
      color: 'tertiary',
    },
    {
      title: 'View Analytics',
      description: 'Check your blog performance',
      icon: 'analytics',
      action: () => navigate('/admin/analytics'),
      color: 'error',
    },
  ];

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="dashboard-loading">
          <md-circular-progress indeterminate></md-circular-progress>
          <p className="md-typescale-body-medium">Loading dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <div className="dashboard-error">
          <md-icon class="error-icon">error</md-icon>
          <h2 className="md-typescale-headline-small">Error Loading Dashboard</h2>
          <p className="md-typescale-body-medium">{error}</p>
          <md-filled-button onClick={loadDashboardData}>
            <md-icon slot="icon">refresh</md-icon>
            Retry
          </md-filled-button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="dashboard">
        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <h1 className="md-typescale-display-small">Welcome back!</h1>
          <p className="md-typescale-body-large">
            Here's what's happening with your blog today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          {statCards.map((card, index) => (
            <md-elevated-card key={index} class={`stat-card stat-card-${card.color}`}>
              <div className="stat-card-content">
                <div className="stat-header">
                  <md-icon class="stat-icon">{card.icon}</md-icon>
                  {card.trend && (
                    <div className={`stat-trend ${card.trend.isPositive ? 'positive' : 'negative'}`}>
                      <md-icon>{card.trend.isPositive ? 'trending_up' : 'trending_down'}</md-icon>
                      <span>{card.trend.value}%</span>
                    </div>
                  )}
                </div>
                <div className="stat-body">
                  <h3 className="stat-value md-typescale-display-medium">{card.value}</h3>
                  <p className="stat-title md-typescale-body-medium">{card.title}</p>
                </div>
              </div>
            </md-elevated-card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2 className="md-typescale-headline-medium">Quick Actions</h2>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <md-outlined-card key={index} class="quick-action-card" onClick={action.action}>
                <div className="quick-action-content">
                  <md-icon class={`action-icon action-icon-${action.color}`}>
                    {action.icon}
                  </md-icon>
                  <div className="action-text">
                    <h3 className="md-typescale-title-medium">{action.title}</h3>
                    <p className="md-typescale-body-medium">{action.description}</p>
                  </div>
                  <md-icon class="action-arrow">arrow_forward</md-icon>
                </div>
              </md-outlined-card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity-section">
          <h2 className="md-typescale-headline-medium">Recent Activity</h2>
          <md-outlined-card class="activity-card">
            <div className="activity-content">
              <md-icon class="activity-icon">history</md-icon>
              <div className="activity-text">
                <p className="md-typescale-body-large">No recent activity</p>
                <p className="md-typescale-body-medium">
                  Start creating content to see your activity here.
                </p>
              </div>
            </div>
          </md-outlined-card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
