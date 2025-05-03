import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts, getAllCategories } from '@/lib/blog-server';
import { checkAuth } from '@/lib/blog-admin-server';

export async function GET(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 获取所有文章
    const { posts, totalPosts } = getAllPosts(1, 1000);

    // 获取所有分类
    const categories = getAllCategories();

    // 获取最新的文章
    const sortedPosts = [...posts].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // 获取最近的5篇文章
    const recentPosts = sortedPosts.slice(0, 5);

    // 返回数据
    return NextResponse.json({
      success: true,
      data: {
        posts,
        categories,
        recentPosts,
        totalPosts,
        totalCategories: categories.length,
        latestPost: sortedPosts.length > 0 ? sortedPosts[0] : null
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      },
      { status: 500 }
    );
  }
}
