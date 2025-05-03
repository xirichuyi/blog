import { NextResponse } from 'next/server';
import { getPostBySlug, getRelatedPosts } from '@/lib/blog-server';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 3;
    
    const post = await getPostBySlug(params.slug);
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const relatedPosts = getRelatedPosts(post, limit);
    return NextResponse.json(relatedPosts);
  } catch (error) {
    console.error(`Error fetching related posts for slug ${params.slug}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
