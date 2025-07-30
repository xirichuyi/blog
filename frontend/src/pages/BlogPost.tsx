import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BlogPost as BlogPostType } from '@/types/blog';
import { blogApi } from '@/services/api';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      navigate('/blog');
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        const postData = await blogApi.getPostBySlug(slug);
        setPost(postData);

        // Fetch related posts (posts with similar categories)
        if (postData.categories.length > 0) {
          const allPosts = await blogApi.getPosts(1, 20);
          const related = allPosts.posts
            .filter(p => 
              p.id !== postData.id && 
              p.categories.some(cat => postData.categories.includes(cat))
            )
            .slice(0, 3);
          setRelatedPosts(related);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-apple-gray-300">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-apple-gray-300 mb-8">The post you're looking for doesn't exist.</p>
          <Link to="/blog" className="btn-apple btn-apple-primary">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <article className="py-20">
        <div className="container-apple max-w-4xl">
          {/* Post Header */}
          <motion.header
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map((category, index) => (
                <Link
                  key={index}
                  to={`/categories/${category}`}
                  className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
            <div className="flex items-center text-apple-gray-400 text-sm">
              <span>{new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </motion.header>

          {/* Post Content */}
          <motion.div
            className="prose prose-lg prose-invert max-w-none mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-3xl font-bold mb-4 text-white">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-bold mb-3 text-white">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-bold mb-2 text-white">{children}</h3>,
                p: ({ children }) => <p className="mb-4 text-apple-gray-300 leading-relaxed">{children}</p>,
                a: ({ href, children }) => (
                  <a href={href} className="text-primary hover:text-primary-light transition-colors">
                    {children}
                  </a>
                ),
                code: ({ children }) => (
                  <code className="bg-apple-gray-800 px-2 py-1 rounded text-sm text-primary">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-apple-gray-800 p-4 rounded-lg overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
              }}
            >
              {post.content || post.excerpt}
            </ReactMarkdown>
          </motion.div>

          {/* Navigation */}
          <motion.div
            className="flex justify-between items-center py-8 border-t border-apple-gray-700"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link
              to="/blog"
              className="btn-apple btn-apple-secondary"
            >
              ← Back to Blog
            </Link>
          </motion.div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <motion.section
              className="mt-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <article key={relatedPost.id} className="card-apple p-4">
                    <h3 className="font-bold mb-2">
                      <Link
                        to={`/blog/${relatedPost.slug}`}
                        className="hover:text-primary transition-colors"
                      >
                        {relatedPost.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-apple-gray-300 mb-3">
                      {relatedPost.excerpt}
                    </p>
                    <div className="text-xs text-apple-gray-400">
                      {new Date(relatedPost.date).toLocaleDateString()}
                    </div>
                  </article>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </article>
    </div>
  );
}
