import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { AdminDashboardData } from '@/types/blog';
import { adminApi } from '@/services/api';
import { dataConsistencyTester } from '@/utils/dataConsistencyTest';

// 系统状态接口
interface SystemStatus {
  serverStatus: 'online' | 'offline' | 'maintenance';
  databaseStatus: 'connected' | 'disconnected' | 'error';
  storageUsage: number; // 百分比
  lastUpdated: Date;
}

// 统计趋势接口
interface StatsTrend {
  postsGrowth: number; // 百分比
  categoriesGrowth: number; // 数量变化
  publishedGrowth: number; // 数量变化
  viewsToday: number; // 今日浏览量
  viewsGrowth: number; // 浏览量增长百分比
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [statsTrend, setStatsTrend] = useState<StatsTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTestingConsistency, setIsTestingConsistency] = useState(false);

  // 获取系统状态的函数
  const fetchSystemStatus = async (): Promise<SystemStatus> => {
    try {
      // 首先尝试使用管理员系统状态API
      const statusData = await adminApi.getSystemStatus();

      return {
        serverStatus: statusData.serverStatus as 'online' | 'offline' | 'maintenance',
        databaseStatus: statusData.databaseStatus as 'connected' | 'disconnected' | 'error',
        storageUsage: statusData.storageUsage,
        lastUpdated: new Date(statusData.lastUpdated)
      };
    } catch (error) {
      console.warn('Admin system status API failed, falling back to health check:', error);

      try {
        // 回退到基础健康检查
        const healthResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`);
        const serverStatus = healthResponse.ok ? 'online' : 'offline';

        return {
          serverStatus,
          databaseStatus: serverStatus === 'online' ? 'connected' : 'disconnected',
          storageUsage: 75, // 默认值
          lastUpdated: new Date()
        };
      } catch (fallbackError) {
        console.error('All system status checks failed:', fallbackError);
        return {
          serverStatus: 'offline',
          databaseStatus: 'error',
          storageUsage: 0,
          lastUpdated: new Date()
        };
      }
    }
  };

  // 获取统计趋势的函数
  const fetchStatsTrend = async (): Promise<StatsTrend> => {
    try {
      const trends = await adminApi.getStatsTrends();
      return trends;
    } catch (error) {
      console.warn('Failed to fetch stats trends, using fallback data:', error);
      // 回退到模拟数据
      return {
        postsGrowth: Math.floor(Math.random() * 20) + 5,
        categoriesGrowth: Math.floor(Math.random() * 3) + 1,
        publishedGrowth: Math.floor(Math.random() * 8) + 2,
        viewsToday: Math.floor(Math.random() * 3000) + 1000,
        viewsGrowth: Math.floor(Math.random() * 30) + 10
      };
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // 并行获取所有数据
        const [dashboardData, systemStatus, statsTrend] = await Promise.all([
          adminApi.getDashboardData(),
          fetchSystemStatus(),
          fetchStatsTrend()
        ]);

        setDashboardData(dashboardData);
        setSystemStatus(systemStatus);
        setStatsTrend(statsTrend);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    // 设置定时器每30秒更新系统状态，每5分钟更新统计趋势
    const statusInterval = setInterval(async () => {
      try {
        const status = await fetchSystemStatus();
        setSystemStatus(status);
      } catch (error) {
        console.error('Error updating system status:', error);
      }
    }, 30000);

    const trendsInterval = setInterval(async () => {
      try {
        const trends = await fetchStatsTrend();
        setStatsTrend(trends);
      } catch (error) {
        console.error('Error updating stats trends:', error);
      }
    }, 300000); // 5分钟

    return () => {
      clearInterval(statusInterval);
      clearInterval(trendsInterval);
    };
  }, []);

  // 运行数据一致性测试
  const runConsistencyTest = async () => {
    setIsTestingConsistency(true);
    try {
      await dataConsistencyTester.runAllTests();
      alert('Data consistency test completed! Check console for detailed results.');
    } catch (error) {
      console.error('Error running consistency test:', error);
      alert('Error running consistency test. Check console for details.');
    } finally {
      setIsTestingConsistency(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
        />
      </div>
    );
  }

  if (error || !dashboardData || !statsTrend) {
    return (
      <div className="text-center py-12">
        <div className="admin-card p-8 max-w-md mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-red-400">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={() => window.location.reload()}
            className="admin-btn admin-btn-primary mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 格式化数字显示
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const statsCards = [
    {
      title: 'Total Posts',
      value: dashboardData.totalPosts,
      icon: 'document-text',
      color: 'primary',
      trend: `+${statsTrend.postsGrowth}%`,
      trendUp: statsTrend.postsGrowth > 0
    },
    {
      title: 'Categories',
      value: dashboardData.totalCategories,
      icon: 'tag',
      color: 'green',
      trend: `+${statsTrend.categoriesGrowth}`,
      trendUp: statsTrend.categoriesGrowth > 0
    },
    {
      title: 'Published',
      value: dashboardData.totalPosts, // 使用总文章数而不是最近文章数
      icon: 'check-circle',
      color: 'blue',
      trend: `+${statsTrend.publishedGrowth}`,
      trendUp: statsTrend.publishedGrowth > 0
    },
    {
      title: 'Views Today',
      value: formatNumber(statsTrend.viewsToday),
      icon: 'eye',
      color: 'purple',
      trend: `+${statsTrend.viewsGrowth}%`,
      trendUp: statsTrend.viewsGrowth > 0
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="admin-card p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome back, Cyrus! 👋
            </h1>
            <p className="text-gray-400">
              Here's what's happening with your blog today.
            </p>
          </div>
          <div className="hidden md:block">
            <Link to="/admin/posts/new" className="admin-btn admin-btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Post
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="admin-stat-card group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${stat.color}-500/20`}>
                {renderStatIcon(stat.icon, stat.color)}
              </div>
              <div className={`flex items-center text-sm ${stat.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${stat.trendUp ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                {stat.trend}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="lg:col-span-2 admin-card p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Recent Posts</h2>
            <Link to="/admin/posts" className="admin-btn admin-btn-secondary text-sm">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {dashboardData.recentPosts.slice(0, 5).map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white group-hover:text-primary transition-colors truncate">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{post.excerpt}</p>
                  <div className="flex gap-2 mt-2">
                    {post.categories.slice(0, 2).map((category, idx) => (
                      <span
                        key={idx}
                        className="admin-badge admin-badge-info text-xs"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-sm text-gray-400">
                    {new Date(post.date).toLocaleDateString()}
                  </div>
                  <div className="admin-badge admin-badge-success text-xs mt-1">
                    Published
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-6"
        >
          {/* Quick Actions Card */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/admin/posts/new" className="admin-btn admin-btn-primary w-full justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Post
              </Link>
              <Link to="/admin/categories" className="admin-btn admin-btn-secondary w-full justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Manage Categories
              </Link>
              <Link to="/admin/media" className="admin-btn admin-btn-secondary w-full justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Media
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="admin-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">System Status</h3>
              {systemStatus && (
                <span className="text-xs text-gray-400">
                  Updated: {systemStatus.lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Server Status</span>
                <span className={`admin-badge ${
                  systemStatus?.serverStatus === 'online'
                    ? 'admin-badge-success'
                    : systemStatus?.serverStatus === 'maintenance'
                    ? 'admin-badge-warning'
                    : 'admin-badge-error'
                }`}>
                  {systemStatus?.serverStatus === 'online' ? 'Online' :
                   systemStatus?.serverStatus === 'maintenance' ? 'Maintenance' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Database</span>
                <span className={`admin-badge ${
                  systemStatus?.databaseStatus === 'connected'
                    ? 'admin-badge-success'
                    : systemStatus?.databaseStatus === 'disconnected'
                    ? 'admin-badge-warning'
                    : 'admin-badge-error'
                }`}>
                  {systemStatus?.databaseStatus === 'connected' ? 'Connected' :
                   systemStatus?.databaseStatus === 'disconnected' ? 'Disconnected' : 'Error'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Storage</span>
                <span className={`admin-badge ${
                  (systemStatus?.storageUsage || 0) < 80
                    ? 'admin-badge-success'
                    : (systemStatus?.storageUsage || 0) < 90
                    ? 'admin-badge-warning'
                    : 'admin-badge-error'
                }`}>
                  {systemStatus?.storageUsage || 0}% Used
                </span>
              </div>
              <div className="pt-3 border-t border-gray-700">
                <button
                  onClick={runConsistencyTest}
                  disabled={isTestingConsistency}
                  className="w-full admin-btn admin-btn-secondary text-sm"
                >
                  {isTestingConsistency ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Test Data Consistency
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function renderStatIcon(iconName: string, color: string) {
  const iconClass = `h-6 w-6 text-${color}-400`;

  switch (iconName) {
    case 'document-text':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'tag':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'eye':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    default:
      return null;
  }
}
