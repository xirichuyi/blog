import { BlogPost } from './blog-types';

// 客户端安全版本的博客函数
// 这些函数将通过API调用获取数据，而不是直接访问文件系统

// 获取所有博客文章
export async function getAllPosts(page: number = 1, postsPerPage: number = 6): Promise<{ posts: BlogPost[], totalPosts: number, totalPages: number }> {
  // 在服务器组件中，这个函数会被直接导入的服务器端版本替代
  // 在客户端组件中，我们通过API获取数据
  try {
    const response = await fetch(`/api/posts?page=${page}&limit=${postsPerPage}`);
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching posts:', error);
    return { posts: [], totalPosts: 0, totalPages: 0 };
  }
}

// 根据slug获取博客文章数据
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(`/api/posts/${slug}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch post');
    }
    return await response.json();
  } catch (error) {
    console.error(`Error getting post by slug ${slug}:`, error);
    return null;
  }
}

// 获取所有分类
export async function getAllCategories(): Promise<string[]> {
  try {
    const response = await fetch('/api/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// 根据分类获取博客文章
export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  try {
    const response = await fetch(`/api/categories/${category}`);
    if (!response.ok) {
      throw new Error('Failed to fetch posts by category');
    }
    return await response.json();
  } catch (error) {
    console.error(`Error getting posts by category ${category}:`, error);
    return [];
  }
}

// 搜索博客文章
export async function searchPosts(query: string): Promise<BlogPost[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  try {
    const response = await fetch(`/api/posts?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search posts');
    }
    return await response.json();
  } catch (error) {
    console.error(`Error searching posts with query ${query}:`, error);
    return [];
  }
}

// 获取相关文章
export async function getRelatedPosts(currentPost: BlogPost, limit: number = 3): Promise<BlogPost[]> {
  try {
    const response = await fetch(`/api/posts/${currentPost.slug}/related?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch related posts');
    }
    return await response.json();
  } catch (error) {
    console.error(`Error getting related posts for ${currentPost.slug}:`, error);
    return [];
  }
}
