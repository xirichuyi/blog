import { NextRequest, NextResponse } from 'next/server';
import { createPost, checkAuth } from '@/lib/blog-admin-server';
import { getAllPosts } from '@/lib/blog-server';

// 获取所有博客文章
export async function GET(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const posts = getAllPosts();
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// 创建新博客文章
export async function POST(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const postData = await request.json();

    // 验证必要字段
    const requiredFields = ['title', 'excerpt', 'date', 'categories', 'content'];
    const missingFields = requiredFields.filter(field => !postData[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await createPost(postData);

    if (result.success) {
      return NextResponse.json(result.post, { status: 201 });
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
