import { searchPosts } from "@/lib/blog-server";
import SearchClient from "./SearchClient";

export const metadata = {
  title: "Search Results | Cyrus",
  description: "Search results for your query",
};

export default function SearchResults({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || '';

  // 搜索逻辑
  const searchResults = query ? searchPosts(query) : [];

  // 使用客户端组件渲染UI
  return <SearchClient searchResults={searchResults} />;
}
