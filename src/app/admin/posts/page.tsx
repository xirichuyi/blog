"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PostsTable from '@/components/admin/PostsTable';
import { BlogPost } from '@/lib/blog';

export default function AdminPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch('/api/admin/posts', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }

        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
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
          Loading posts...
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link href="/admin/posts/new" className="btn-apple btn-apple-primary">
          New Post
        </Link>
      </div>

      <PostsTable initialPosts={posts} />
    </div>
  );
}
