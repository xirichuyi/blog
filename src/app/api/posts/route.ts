import { NextResponse } from 'next/server';
import { getAllPosts, searchPosts } from '@/lib/blog';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (query) {
    // 如果有查询参数，返回搜索结果
    const results = searchPosts(query);
    return NextResponse.json(results);
  } else {
    // 否则返回所有文章
    const posts = getAllPosts();
    return NextResponse.json(posts);
  }
}
