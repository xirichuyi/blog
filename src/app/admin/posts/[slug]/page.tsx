"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPostBySlug } from '@/lib/blog';
import PostEditor from '@/components/admin/PostEditor';

// 定义博客文章的类型
interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  categories: string[];
  content?: string;
}

export default function EditPost({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      try {
        const postData = await getPostBySlug(params.slug);
        if (!postData) {
          router.push('/404');
          return;
        }
        setPost(postData);
      } catch (error) {
        console.error('Error loading post:', error);
        router.push('/404');
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [params.slug, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return null;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Post</h1>
      <PostEditor post={post} mode="edit" />
    </div>
  );
}
