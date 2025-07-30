import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { BlogPost } from '@/types/blog';
import { blogApi } from '@/services/api';

export default function Categories() {
  const { category } = useParams<{ category: string }>();
  const [categories, setCategories] = useState<string[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all categories
        const categoriesData = await blogApi.getCategories();
        setCategories(categoriesData);

        // If a specific category is selected, fetch posts for that category
        if (category) {
          const postsData = await blogApi.getPostsByCategory(category);
          setPosts(postsData);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load categories and posts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-apple-gray-300">Loading...</p>
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
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Categories</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {category ? `Category: ${category}` : 'Categories'}
          </h1>
          <p className="text-xl text-apple-gray-300">
            {category ? `Posts in ${category}` : 'Browse articles by category'}
          </p>
        </motion.div>

        {!category ? (
          // Show all categories
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {categories.map((cat, index) => (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Link
                  to={`/categories/${cat}`}
                  className="card-apple p-6 block hover:scale-105 transition-transform"
                >
                  <h2 className="text-xl font-bold text-white mb-2">{cat}</h2>
                  <p className="text-apple-gray-300">
                    Explore articles in {cat}
                  </p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // Show posts for selected category
          <>
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Link
                to="/categories"
                className="btn-apple btn-apple-secondary"
              >
                ← All Categories
              </Link>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                      {post.categories.map((cat, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                        >
                          {cat}
                        </span>
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

            {posts.length === 0 && (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <p className="text-apple-gray-400">No posts found in this category.</p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
