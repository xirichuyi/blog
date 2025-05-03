import { NextResponse } from 'next/server';
import { getPostsByCategory } from '@/lib/blog-server';

export async function GET(
  request: Request,
  { params }: { params: { category: string } }
) {
  try {
    const posts = getPostsByCategory(params.category);
    return NextResponse.json(posts);
  } catch (error) {
    console.error(`Error fetching posts for category ${params.category}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
