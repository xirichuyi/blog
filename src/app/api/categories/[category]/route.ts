import { NextResponse } from 'next/server';
import { getPostsByCategory } from '@/lib/blog-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const posts = getPostsByCategory(category);
    return NextResponse.json(posts);
  } catch (error) {
    console.error(`Error fetching posts for category:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
