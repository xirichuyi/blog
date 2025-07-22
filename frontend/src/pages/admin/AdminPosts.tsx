import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { BlogPost } from '../../types/blog';
import { adminApi } from '../../services/api';

export default function AdminPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await adminApi.getAllPosts();
        setPosts(data.posts);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleDeletePost = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await adminApi.deletePost(slug);
      setPosts(posts.filter(post => post.slug !== slug));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Posts</h1>
          <Link to="/admin/posts/new" className="btn-apple btn-apple-primary">
            Create New Post
          </Link>
        </div>

        <div className="card-apple">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-apple-gray-700">
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4">Categories</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-apple-gray-700 last:border-0">
                    <td className="p-4">
                      <div>
                        <h3 className="font-semibold text-white">{post.title}</h3>
                        <p className="text-sm text-apple-gray-300 mt-1">{post.excerpt}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {post.categories.map((category, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-apple-gray-300">
                      {new Date(post.date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/posts/${post.slug}`}
                          className="text-primary hover:text-primary-light text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeletePost(post.slug)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                        <Link
                          to={`/blog/${post.slug}`}
                          target="_blank"
                          className="text-apple-gray-400 hover:text-white text-sm"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {posts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-apple-gray-400">No posts found.</p>
              <Link to="/admin/posts/new" className="btn-apple btn-apple-primary mt-4">
                Create Your First Post
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
