"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BlogPost } from '@/lib/blog';

// 定义仪表板数据类型
interface DashboardData {
  posts: BlogPost[];
  categories: string[];
  recentPosts: BlogPost[];
  totalPosts: number;
  totalCategories: number;
  latestPost: BlogPost | null;
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const result = await response.json();
        if (result.success) {
          setDashboardData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch dashboard data');
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-apple-gray-400">
          <svg className="animate-spin h-8 w-8 mr-3 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading dashboard...
        </div>
      </div>
    );
  }

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className="bg-red-900/30 text-red-300 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  // 如果没有数据，显示空状态
  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p>No dashboard data available.</p>
      </div>
    );
  }

  // 从dashboardData中提取recentPosts
  const { recentPosts } = dashboardData;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-2">Total Posts</h2>
          <p className="text-3xl font-bold text-primary">{dashboardData.totalPosts}</p>
        </div>

        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-2">Categories</h2>
          <p className="text-3xl font-bold text-primary">{dashboardData.totalCategories}</p>
        </div>

        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-2">Latest Post</h2>
          <p className="text-lg font-medium text-primary truncate">
            {dashboardData.latestPost ? dashboardData.latestPost.title : 'No posts yet'}
          </p>
          <p className="text-sm text-apple-gray-500 dark:text-apple-gray-400">
            {dashboardData.latestPost ? dashboardData.latestPost.date : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-apple p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Posts</h2>
            <Link href="/admin/posts" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-apple-gray-200 dark:divide-apple-gray-700">
            {recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <div key={post.id} className="py-3">
                  <Link href={`/admin/posts/${post.slug}`} className="hover:text-primary">
                    <h3 className="font-medium mb-1 truncate">{post.title}</h3>
                    <p className="text-sm text-apple-gray-500 dark:text-apple-gray-400">
                      {post.date} • {post.categories.join(', ')}
                    </p>
                  </Link>
                </div>
              ))
            ) : (
              <p className="py-3 text-apple-gray-500 dark:text-apple-gray-400">
                No posts yet. Create your first post!
              </p>
            )}
          </div>

          <div className="mt-4">
            <Link href="/admin/posts/new" className="btn-apple btn-apple-primary w-full">
              Create New Post
            </Link>
          </div>
        </div>

        <div className="card-apple p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>

          <div className="space-y-3">
            <Link href="/admin/posts/new" className="card-apple bg-primary/10 p-4 flex items-center hover:bg-primary/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">New Post</h3>
                <p className="text-sm text-apple-gray-600 dark:text-apple-gray-300">Create a new blog post</p>
              </div>
            </Link>

            <Link href="/admin/ai-assistant" className="card-apple bg-primary/10 p-4 flex items-center hover:bg-primary/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">AI Assistant</h3>
                <p className="text-sm text-apple-gray-600 dark:text-apple-gray-300">Generate content with AI</p>
              </div>
            </Link>

            <Link href="/admin/categories" className="card-apple bg-primary/10 p-4 flex items-center hover:bg-primary/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Manage Categories</h3>
                <p className="text-sm text-apple-gray-600 dark:text-apple-gray-300">Organize your blog posts</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
