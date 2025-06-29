import { NextRequest, NextResponse } from 'next/server';
import { updatePost, deletePost, checkAuth } from '@/lib/blog-admin-server';
import { getPostBySlug } from '@/lib/blog-server';

// 获取单个博客文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const post = await getPostBySlug(slug);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error(`Error fetching post with slug ${params.slug}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// 更新博客文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const postData = await request.json();

    const result = await updatePost(slug, postData);

    if (result.success) {
      return NextResponse.json(result.post);
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: result.message?.includes('not found') ? 404 : 500 }
      );
    }
  } catch (error) {
    console.error(`Error updating post with slug ${params.slug}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// 删除博客文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const result = await deletePost(slug);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: result.message?.includes('not found') ? 404 : 500 }
      );
    }
  } catch (error) {
    console.error(`Error deleting post with slug ${params.slug}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
