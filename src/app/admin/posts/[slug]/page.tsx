import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/blog';
import PostEditor from '@/components/admin/PostEditor';

export default async function EditPost({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  
  if (!post) {
    notFound();
  }
  
  // 获取原始Markdown内容
  const filePath = `src/data/blog/${params.slug}.md`;
  let markdownContent = '';
  
  try {
    const fs = require('fs');
    const path = require('path');
    const matter = require('gray-matter');
    
    const fullPath = path.join(process.cwd(), filePath);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { content } = matter(fileContents);
    
    markdownContent = content;
  } catch (error) {
    console.error('Error reading markdown content:', error);
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Post</h1>
      <PostEditor post={{ ...post, content: markdownContent }} mode="edit" />
    </div>
  );
}
