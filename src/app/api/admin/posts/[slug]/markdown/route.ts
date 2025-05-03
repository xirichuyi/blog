import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { checkAuth } from '@/lib/blog-admin';

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
    const postsDirectory = path.join(process.cwd(), 'src/data/blog');
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { content } = matter(fileContents);
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error(`Error fetching markdown content for slug ${params.slug}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
