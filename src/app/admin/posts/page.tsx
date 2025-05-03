import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import PostsTable from '@/components/admin/PostsTable';

export default function AdminPosts() {
  // 在服务器端获取所有博客文章
  const posts = getAllPosts();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link href="/admin/posts/new" className="btn-apple btn-apple-primary">
          New Post
        </Link>
      </div>

      {/* 使用客户端组件处理交互 */}
      <PostsTable initialPosts={posts} />
    </div>
  );
}
