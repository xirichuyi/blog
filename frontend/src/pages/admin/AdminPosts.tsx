import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { BlogPost } from '../../types/blog';
import { adminApi } from '../../services/api';
import PostsTable from '../../components/admin/PostsTable';

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

  const handlePostDeleted = (slug: string) => {
    setPosts(posts.filter(post => post.slug !== slug));
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
          <Link to="/admin/posts/new" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Create New Post
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-400">No posts found.</p>
            <Link to="/admin/posts/new" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors mt-4 inline-block">
              Create Your First Post
            </Link>
          </div>
        ) : (
          <PostsTable initialPosts={posts} onPostDeleted={handlePostDeleted} />
        )}
      </motion.div>
    </div>
  );
}
