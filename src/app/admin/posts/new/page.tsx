import PostEditor from '@/components/admin/PostEditor';

export default function NewPost() {
  // 创建一个空的博客文章对象
  const emptyPost = {
    id: 0,
    title: '',
    excerpt: '',
    date: new Date().toISOString().split('T')[0],
    slug: '',
    categories: [],
    content: ''
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Post</h1>
      <PostEditor post={emptyPost} mode="new" />
    </div>
  );
}
