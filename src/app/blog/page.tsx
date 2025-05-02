import BlogClient from "./BlogClient";
import { getAllPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog | Cyrus",
  description: "Read the latest articles and insights from Cyrus",
};

export default function Blog() {
  // 从Markdown文件中获取博客文章数据
  const blogPosts = getAllPosts();

  // 使用客户端组件渲染UI
  return <BlogClient blogPosts={blogPosts} />;
}
