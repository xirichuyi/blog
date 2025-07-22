import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { AdminDashboardData } from '../../types/blog';
import { adminApi } from '../../services/api';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await adminApi.getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error || 'Failed to load dashboard'}</p>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-apple p-6">
            <h3 className="text-lg font-semibold text-apple-gray-300">Total Posts</h3>
            <p className="text-3xl font-bold text-primary">{dashboardData.totalPosts}</p>
          </div>
          <div className="card-apple p-6">
            <h3 className="text-lg font-semibold text-apple-gray-300">Categories</h3>
            <p className="text-3xl font-bold text-primary">{dashboardData.totalCategories}</p>
          </div>
          <div className="card-apple p-6">
            <h3 className="text-lg font-semibold text-apple-gray-300">Recent Posts</h3>
            <p className="text-3xl font-bold text-primary">{dashboardData.recentPosts.length}</p>
          </div>
          <div className="card-apple p-6">
            <h3 className="text-lg font-semibold text-apple-gray-300">Latest Post</h3>
            <p className="text-sm text-apple-gray-300">
              {dashboardData.latestPost 
                ? new Date(dashboardData.latestPost.date).toLocaleDateString()
                : 'No posts'
              }
            </p>
          </div>
        </div>

        {/* Recent Posts */}
        <div className="card-apple p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Posts</h2>
            <Link to="/admin/posts" className="btn-apple btn-apple-primary">
              View All Posts
            </Link>
          </div>
          
          <div className="space-y-4">
            {dashboardData.recentPosts.map((post) => (
              <div key={post.id} className="border-b border-apple-gray-700 pb-4 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white">{post.title}</h3>
                    <p className="text-sm text-apple-gray-300 mt-1">{post.excerpt}</p>
                    <div className="flex gap-2 mt-2">
                      {post.categories.map((category, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-apple-gray-400">
                    {new Date(post.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
