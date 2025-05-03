import { NextResponse } from 'next/server';
import { getAllPosts, getAllCategories } from '@/lib/blog';

export async function GET(request: Request) {
  try {
    // 获取所有文章
    const { posts } = getAllPosts();
    
    // 获取所有分类
    const categories = getAllCategories();
    
    // 获取最近的5篇文章
    const recentPosts = posts.slice(0, 5);
    
    // 返回数据
    return NextResponse.json({
      success: true,
      data: {
        posts,
        categories,
        recentPosts,
        totalPosts: posts.length,
        totalCategories: categories.length,
        latestPost: posts.length > 0 ? posts[0] : null
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
