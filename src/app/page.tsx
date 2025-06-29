import { getAllPosts } from "@/lib/blog-server";
import HomeClient from "./HomeClient";

export const metadata = {
  title: "Cyrus | Business Strategy & Leadership Insights",
  description: "Explore the latest insights on business strategy, leadership, and innovation.",
};

export default async function Home() {
  // 获取最新的3篇文章用于首页展示
  const { posts: latestPosts } = getAllPosts(1, 3);
  return <HomeClient latestPosts={latestPosts} />;

