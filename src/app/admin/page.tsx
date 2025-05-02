import Link from 'next/link';
import { getAllPosts, getAllCategories } from '@/lib/blog';

export default function AdminDashboard() {
  const posts = getAllPosts();
  const categories = getAllCategories();
  
  // 获取最近的5篇文章
  const recentPosts = posts.slice(0, 5);
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-2">Total Posts</h2>
          <p className="text-3xl font-bold text-primary">{posts.length}</p>
        </div>
        
        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-2">Categories</h2>
          <p className="text-3xl font-bold text-primary">{categories.length}</p>
        </div>
        
        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-2">Latest Post</h2>
          <p className="text-lg font-medium text-primary truncate">
            {posts.length > 0 ? posts[0].title : 'No posts yet'}
          </p>
          <p className="text-sm text-apple-gray-500 dark:text-apple-gray-400">
            {posts.length > 0 ? posts[0].date : ''}
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
