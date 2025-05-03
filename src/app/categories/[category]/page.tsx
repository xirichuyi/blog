import { notFound } from "next/navigation";
import { getAllCategories, getPostsByCategory } from "@/lib/blog-server";
import CategoryClient from "./CategoryClient";

export async function generateMetadata({ params }: { params: { category: string } }) {
  // 解码URL参数
  const categorySlug = params.category;
  
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

export default function CategoryPage({ params }: { params: { category: string } }) {
  // 解码URL参数
  const categorySlug = params.category;
  
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
