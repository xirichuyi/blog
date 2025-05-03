import { BlogPost } from './blog-types';

// 客户端安全版本的博客管理函数
// 这些函数将通过API调用与服务器交互，而不是直接访问文件系统

// 创建新的博客文章
export async function createPost(postData: Omit<BlogPost, 'id'> & { content: string }): Promise<{ success: boolean; message?: string; post?: BlogPost }> {
  try {
    const response = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create post');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// 更新博客文章
export async function updatePost(slug: string, postData: Partial<BlogPost> & { content?: string }): Promise<{ success: boolean; message?: string; post?: BlogPost }> {
  try {
    const response = await fetch(`/api/admin/posts/${slug}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update post');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating post:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// 删除博客文章
export async function deletePost(slug: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`/api/admin/posts/${slug}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete post');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting post:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// 简单的身份验证检查（客户端版本）
export function checkAuth(authToken?: string): boolean {
  // 在客户端，我们只能检查令牌是否存在
  // 实际验证将在服务器端进行
  return !!authToken && authToken.length > 0;
}
