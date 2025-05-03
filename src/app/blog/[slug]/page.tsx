import { notFound } from "next/navigation";
import { getPostBySlug, getRelatedPosts } from "@/lib/blog-server";
import BlogPostClient from "./BlogPostClient";
import type { BlogPost } from "@/lib/blog-types";

// 确保 BlogPostClient 接收的 content 属性不为 undefined
function ensureContent(post: BlogPost): BlogPost & { content: string } {
  return {
    ...post,
    content: post.content || ''
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  // 使用 params.slug 而不是 await params.slug
  const slug = params.slug;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | Cyrus",
      description: "The requested blog post could not be found.",
    };
  }

  return {
    title: `${post.title} | Cyrus`,
    description: post.excerpt,
  };
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  // 使用 params.slug 而不是 await params.slug
  const slug = params.slug;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // 获取相关文章
  const relatedPosts = getRelatedPosts(post, 3);

  // 确保 post 和 relatedPosts 的 content 属性不为 undefined
  const postWithContent = ensureContent(post);
  const relatedPostsWithContent = relatedPosts.map(ensureContent);

  // 使用客户端组件渲染UI
  return <BlogPostClient post={postWithContent} relatedPosts={relatedPostsWithContent} />;
}
