import { notFound } from "next/navigation";
import { getAllCategories, getPostsByCategory } from "@/lib/blog-server";
import CategoryClient from "./CategoryClient";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  // 在Next.js 15中需要await params
  const { category: categorySlug } = await params;
  
  // 获取所有分类
  const allCategories = getAllCategories();
  
  // 查找匹配的分类
  const matchingCategory = allCategories.find(category => 
    category.toLowerCase().replace(/\s+/g, '-') === categorySlug
  );

  if (!matchingCategory) {
    return {
      title: "Category Not Found | Cyrus",
      description: "The requested category could not be found.",
    };
  }

  return {
    title: `${matchingCategory} | Cyrus`,
    description: `Browse all articles in the ${matchingCategory} category.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  // 在Next.js 15中需要await params
  const { category: categorySlug } = await params;
  
  // 获取所有分类
  const allCategories = getAllCategories();
  
  // 查找匹配的分类
  const matchingCategory = allCategories.find(category => 
    category.toLowerCase().replace(/\s+/g, '-') === categorySlug
  );

  // 如果找不到匹配的分类，返回404
  if (!matchingCategory) {
    notFound();
  }

  // 获取该分类下的文章
  const posts = getPostsByCategory(matchingCategory);

  // 使用客户端组件渲染UI
  return <CategoryClient categoryName={matchingCategory} posts={posts} />;
}
