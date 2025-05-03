import { NextResponse } from 'next/server';
import { getAllPosts, searchPosts } from '@/lib/blog-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 6;

  try {
    if (query) {
      // 如果有查询参数，返回搜索结果
      const results = searchPosts(query);
      return NextResponse.json(results);
    } else {
      // 否则返回所有文章，带分页
      const postsData = getAllPosts(page, limit);
      return NextResponse.json(postsData);
    }
  } catch (error) {
    console.error('Error in posts API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
