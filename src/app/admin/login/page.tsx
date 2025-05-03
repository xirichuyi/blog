"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查是否已经登录
  useEffect(() => {
    const savedToken = localStorage.getItem('blogAdminToken');
    if (savedToken) {
      // 验证令牌
      verifyToken(savedToken);
    }
  }, []);

  // 验证令牌
  const verifyToken = async (tokenToVerify: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      });

      if (response.ok) {
        // 保存令牌到localStorage（用于API请求）
        localStorage.setItem('blogAdminToken', tokenToVerify);

        // 保存令牌到cookie（用于中间件认证）
        document.cookie = `blog-admin-token=${tokenToVerify}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7天过期

        // 重定向到管理页面
        const from = new URLSearchParams(window.location.search).get('from') || '/admin';
        router.push(from);
      } else {
        setError('Invalid token. Please try again.');
        localStorage.removeItem('blogAdminToken');
        document.cookie = 'blog-admin-token=; path=/; max-age=0'; // 删除cookie
      }
    } catch (error) {
      setError('An error occurred while verifying your token.');
      console.error('Error verifying token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理登录
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Please enter your admin token');
      return;
    }

    verifyToken(token);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-apple-gray-100 dark:bg-apple-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Blog Admin</h1>
          <p className="text-apple-gray-600 dark:text-apple-gray-300 mt-2">
            Sign in to manage your blog content
          </p>
        </div>

        <div className="card-apple p-8">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-apple-gray-700 dark:text-apple-gray-300 mb-1">
                Admin Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-2 border border-apple-gray-300 dark:border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-apple-gray-800"
                placeholder="Enter your admin token"
                required
              />
              <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 mt-1">
                The admin token is set in your .env.local file as BLOG_ADMIN_TOKEN
              </p>
            </div>

            <button
              type="submit"
              className="w-full btn-apple btn-apple-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-apple-gray-600 dark:text-apple-gray-300 hover:text-primary"
            >
              Return to Blog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
