import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/blog-admin-server';
import { getPostMarkdown } from '@/lib/markdown-server';

// 获取博客文章的原始Markdown内容
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const slug = params.slug;
    const result = await getPostMarkdown(slug);

    if (!result) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error fetching markdown content for slug ${params.slug}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
