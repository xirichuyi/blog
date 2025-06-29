import BlogClient from "./BlogClient";
import { getAllPosts } from "@/lib/blog-server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Cyrus",
  description: "Read the latest articles and insights from Cyrus",
};

// 定义接收的搜索参数类型
type SearchParams = {
  page?: string;
};

// 接收搜索参数
export default async function Blog({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // 在Next.js 15中需要await searchParams
  const params = await searchParams;
  // 获取当前页码，默认为1
  const currentPage = params.page ? parseInt(params.page) : 1;

  // 每页显示的文章数量
  const postsPerPage = 6;

  // 从Markdown文件中获取博客文章数据，带分页
  const { posts, totalPages } = getAllPosts(currentPage, postsPerPage);

  // 使用客户端组件渲染UI
  return (
    <BlogClient
      blogPosts={posts}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  );
}
