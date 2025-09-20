// Admin Dashboard Component

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../../services/api'
import type { DashboardStats } from '../../../services/types';
import AdminLayout from '../../../components/adminLayout/AdminLayout'
import './style.css';

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

            // Try to load real data from API
            const response = await apiService.getDashboardStats();

            if (response.success && response.data) {
                setStats(response.data);
            } else {
                // Fallback to calculated stats if dashboard API fails
                const [postsResponse, categoriesResponse, tagsResponse] = await Promise.all([
                    apiService.getPosts(1, 1),
                    apiService.getCategories(),
                    apiService.getTags()
                ]);

                const calculatedStats: DashboardStats = {
                    total_music: 0,
                    total_posts: postsResponse.success && postsResponse.data ? postsResponse.data.total : 0,
                    total_categories: categoriesResponse.success && categoriesResponse.data ? categoriesResponse.data.length : 0,
                    total_tags: tagsResponse.success && tagsResponse.data ? tagsResponse.data.length : 0,
                    // total_views: 0, // Can't calculate without view tracking
                    recent_posts: postsResponse.success && postsResponse.data ? postsResponse.data.posts.slice(0, 5) : [],
                    // popularPosts: [], // Can't calculate without view tracking
                    system_info: {
                        // version: '1.0.0',
                        uptime: '0 days',
                        memory_usage: 'N/A',
                        disk_usage: 'N/A'
                    }
                };

                setStats(calculatedStats);
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatCards = (): StatCard[] => {
        if (!stats) return [];

        return [
            {
                title: 'Total Posts',
                value: stats.total_posts,
                icon: 'article',
                color: 'var(--md-sys-color-primary)',
                trend: stats.total_posts > 0 ? { value: 12, isPositive: true } : undefined
            },
            {
                title: 'Categories',
                value: stats.total_categories,
                icon: 'folder',
                color: 'var(--md-sys-color-secondary)',
                trend: stats.total_categories > 0 ? { value: 5, isPositive: true } : undefined
            },
            {
                title: 'Tags',
                value: stats.total_tags,
                icon: 'label',
                color: 'var(--md-sys-color-tertiary)',
                trend: stats.total_tags > 0 ? { value: 8, isPositive: true } : undefined
            },
            {
                title: 'Total Views',
                value: stats.total_views || 'N/A',
                icon: 'visibility',
                color: 'var(--md-sys-color-error)',
                trend: stats.total_views > 0 ? { value: 15, isPositive: true } : undefined
            }
        ];
    };

    const getQuickActions = (): QuickAction[] => [
        {
            title: 'New Post',
            description: 'Create a new blog post',
            icon: 'add',
            action: () => navigate('/admin/posts/new'),
            color: 'var(--md-sys-color-primary)'
        },
        {
            title: 'Manage Posts',
            description: 'View and edit existing posts',
            icon: 'edit',
            action: () => navigate('/admin/posts'),
            color: 'var(--md-sys-color-secondary)'
        },
        {
            title: 'Categories & Tags',
            description: 'Organize content categories and tags',
            icon: 'category',
            action: () => navigate('/admin/categories-tags'),
            color: 'var(--md-sys-color-tertiary)'
        },
        {
            title: 'Music Library',
            description: 'Manage music collection',
            icon: 'library_music',
            action: () => navigate('/admin/music'),
            color: 'var(--md-sys-color-error)'
        }
    ];

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="dashboard-loading">
                    <md-circular-progress indeterminate></md-circular-progress>
                    <p>Loading dashboard...</p>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="dashboard-error">
                    <md-icon className="error-icon">error_outline</md-icon>
                    <h2>Failed to Load Dashboard</h2>
                    <p>{error}</p>
                    <md-filled-button onClick={loadDashboardData}>
                        <md-icon slot="icon">refresh</md-icon>
                        Retry
                    </md-filled-button>
                </div>
            </AdminLayout>
        );
    }

    const statCards = getStatCards();
    const quickActions = getQuickActions();

    return (
        <AdminLayout>
            <div className="dashboard">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">Welcome back! Here's what's happening with your blog.</p>
                </div>

                {/* Stats Cards */}
                <section className="dashboard-stats">
                    <div className="stats-grid">
                        {statCards.map((card, index) => (
                            <div key={index} className="stat-card">
                                <div className="stat-card-header">
                                    <md-icon className="stat-icon" style={{ color: card.color }}>
                                        {card.icon}
                                    </md-icon>
                                    {card.trend && (
                                        <div className={`stat-trend ${card.trend.isPositive ? 'positive' : 'negative'}`}>
                                            <md-icon className="trend-icon">
                                                {card.trend.isPositive ? 'trending_up' : 'trending_down'}
                                            </md-icon>
                                            <span className="trend-value">+{card.trend.value}%</span>
                                        </div>
                                    )}
                                </div>
                                <div className="stat-card-content">
                                    <h3 className="stat-value">{card.value}</h3>
                                    <p className="stat-title">{card.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Quick Actions */}
                <section className="dashboard-actions">
                    <h2 className="section-title">Quick Actions</h2>
                    <div className="actions-grid">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                className="action-card"
                                onClick={action.action}
                            >
                                <div className="action-icon-container">
                                    <md-icon className="action-icon" style={{ color: action.color }}>
                                        {action.icon}
                                    </md-icon>
                                </div>
                                <div className="action-content">
                                    <h3 className="action-title">{action.title}</h3>
                                    <p className="action-description">{action.description}</p>
                                </div>
                                <md-icon className="action-arrow">chevron_right</md-icon>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Recent Posts */}
                {stats && stats.recent_posts && stats.recent_posts.length > 0 && (
                    <section className="dashboard-recent">
                        <div className="section-header">
                            <h2 className="section-title">Recent Posts</h2>
                            <md-text-button onClick={() => navigate('/admin/posts')}>
                                View All
                                <md-icon slot="icon">arrow_forward</md-icon>
                            </md-text-button>
                        </div>
                        <div className="recent-posts">
                            {stats.recent_posts.slice(0, 5).map((post) => (
                                <div key={post.id} className="recent-post-item">
                                    <div className="recent-post-content">
                                        <h4 className="recent-post-title">{post.title}</h4>
                                        <p className="recent-post-meta">
                                            <span className="recent-post-category">{post.category}</span>
                                            <span className="recent-post-date">
                                                {new Date(post.publishDate).toLocaleDateString()}
                                            </span>
                                        </p>
                                    </div>
                                    <md-icon-button
                                        onClick={() => navigate(`/admin/posts/edit/${post.id}`)}
                                        aria-label={`Edit ${post.title}`}
                                    >
                                        <md-icon>edit</md-icon>
                                    </md-icon-button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* System Info */}
                {stats && stats.system_info && (
                    <section className="dashboard-system">
                        <h2 className="section-title">System Information</h2>
                        <div className="system-info">
                            <div className="system-info-item">
                                <md-icon className="system-icon">info</md-icon>
                                <span className="system-label">Version:</span>
                                {/* <span className="system-value">{stats.system_info.version}</span> */}
                            </div>
                            <div className="system-info-item">
                                <md-icon className="system-icon">schedule</md-icon>
                                <span className="system-label">Uptime:</span>
                                <span className="system-value">{stats.system_info.uptime}</span>
                            </div>
                            <div className="system-info-item">
                                <md-icon className="system-icon">memory</md-icon>
                                <span className="system-label">Memory:</span>
                                <span className="system-value">{stats.system_info.memory_usage}</span>
                            </div>
                            <div className="system-info-item">
                                <md-icon className="system-icon">storage</md-icon>
                                <span className="system-label">Disk:</span>
                                <span className="system-value">{stats.system_info.disk_usage}</span>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </AdminLayout>
    );
};

export default Dashboard;
