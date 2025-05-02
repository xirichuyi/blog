import { getAllPosts, getAllCategories } from "@/lib/blog";
import CategoriesClient from "./CategoriesClient";

export const metadata = {
  title: "Categories | Cyrus",
  description: "Browse articles by topic to find exactly what you're looking for.",
};

export default function Categories() {
  // 获取所有博客文章
  const blogPosts = getAllPosts();

  // 获取所有分类
  const allCategories = getAllCategories();

  // 计算每个分类下的文章数量
  const categoryCounts = allCategories.reduce((acc, category) => {
    acc[category] = blogPosts.filter(post =>
      post.categories.includes(category)
    ).length;
    return acc;
  }, {} as Record<string, number>);

  // 使用客户端组件渲染UI
  return <CategoriesClient allCategories={allCategories} categoryCounts={categoryCounts} />;
}
