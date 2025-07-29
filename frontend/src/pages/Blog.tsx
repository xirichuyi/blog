import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { BlogPost } from '../types/blog';
import { blogApi } from '../services/api';

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();
  
  const postsPerPage = 6;

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    fetchPosts(page);
  }, [searchParams]);

  const fetchPosts = async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await blogApi.getPosts(page, postsPerPage);
      setPosts(data.posts);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load blog posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-apple-gray-300">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Posts</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchPosts(currentPage)}
            className="btn-apple btn-apple-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-20">
      <div className="container-apple">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-apple-gray-300 max-w-2xl mx-auto">
            Insights on technology, business strategy, and innovation
          </p>
        </motion.div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              className="card-apple p-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            >
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.categories.map((category, idx) => (
                    <Link
                      key={idx}
                      to={`/categories/${category}`}
                      className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
                <h2 className="text-xl font-bold mb-2 text-white">
                  <Link
                    to={`/blog/${post.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="text-apple-gray-300 text-sm mb-4">
                  {post.excerpt}
                </p>
                <div className="flex justify-between items-center text-sm text-apple-gray-400">
                  <span>{new Date(post.date).toLocaleDateString()}</span>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="text-primary hover:text-primary-light transition-colors"
                  >
                    Read More →
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            className="flex justify-center items-center space-x-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {currentPage > 1 && (
              <Link
                to={`/blog?page=${currentPage - 1}`}
                className="btn-apple btn-apple-secondary px-4 py-2"
              >
                Previous
              </Link>
            )}
            
            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  to={`/blog?page=${page}`}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    page === currentPage
                      ? 'bg-primary text-white'
                      : 'bg-apple-gray-800 text-apple-gray-300 hover:bg-apple-gray-700'
                  }`}
                >
                  {page}
                </Link>
              ))}
            </div>

            {currentPage < totalPages && (
              <Link
                to={`/blog?page=${currentPage + 1}`}
                className="btn-apple btn-apple-secondary px-4 py-2"
              >
                Next
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
