import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories } from '@/lib/blog';
import { checkAuth } from '@/lib/blog-admin';

// 获取所有分类
export async function GET(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categories = getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
