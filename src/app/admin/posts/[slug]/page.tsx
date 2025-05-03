import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/blog';
import PostEditor from '@/components/admin/PostEditor';

export default async function EditPost({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  // 在服务器组件中，我们不直接获取Markdown内容
  // 而是将这个任务交给客户端组件PostEditor

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Post</h1>
      <PostEditor post={post} mode="edit" />
    </div>
  );
}
