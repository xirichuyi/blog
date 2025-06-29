"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  categories?: string[];
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<BlogPost[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 获取所有博客文章
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  // 在组件挂载时获取博客文章数据
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts');
        if (response.ok) {
          const data = await response.json();
          setBlogPosts(data);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    };

    fetchPosts();
  }, []);

  // 当模态框打开时，聚焦到搜索输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 搜索逻辑
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = blogPosts.filter(post =>
      post.title.toLowerCase().includes(term) ||
      post.excerpt.toLowerCase().includes(term) ||
      (post.categories && post.categories.some(category => category.toLowerCase().includes(term)))
    );

    setSearchResults(results);
  }, [searchTerm, blogPosts]);

  // 处理搜索表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() !== '') {
      onClose();
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  // 处理点击模态框外部关闭
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 处理ESC键关闭模态框
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="bg-apple-gray-900 rounded-lg w-full max-w-2xl overflow-hidden border border-apple-gray-700"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">搜索文章</h2>
                <button
                  onClick={onClose}
                  className="text-apple-gray-300 hover:text-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mb-6">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="输入关键词搜索..."
                    className="input-apple w-full pr-12 bg-apple-gray-800 border-apple-gray-700 text-white placeholder-apple-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* 搜索结果 */}
              <div className="max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map(post => (
                      <div key={post.id} className="border-b border-apple-gray-700 pb-4 last:border-0">
                        <Link
                          href={`/blog/${post.slug}`}
                          className="block hover:bg-apple-gray-800 p-2 rounded transition-colors"
                          onClick={onClose}
                        >
                          <h3 className="font-bold text-lg mb-1 text-white hover:text-primary transition-colors">{post.title}</h3>
                          <p className="text-apple-gray-300 text-sm mb-2">{post.excerpt}</p>
                          {post.categories && (
                            <div className="flex flex-wrap gap-2">
                              {post.categories.map((category, index) => (
                                <span key={index} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                  {category}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : searchTerm.trim() !== '' ? (
                  <div className="text-center py-8">
                    <p className="text-apple-gray-400">没有找到匹配的文章</p>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
