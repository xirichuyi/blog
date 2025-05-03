"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostEditor from '@/components/admin/PostEditor';
import { BlogPost } from '@/lib/blog-types';

interface EditPostClientProps {
  slug: string;
}

export default function EditPostClient({ slug }: EditPostClientProps) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      try {
        const response = await fetch(`/api/admin/posts/${slug}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            router.push('/404');
            return;
          }
          throw new Error('Failed to fetch post');
        }

        const postData = await response.json();
        setPost(postData);
      } catch (error) {
        console.error('Error loading post:', error);
        router.push('/404');
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [slug, router]);

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
