import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BlogPost } from './blog-types';

// 博客文章目录路径
const postsDirectory = path.join(process.cwd(), 'src/data/blog');

// 内容格式验证和清理函数
function validateAndCleanContent(content: string): string {
  // 检测是否包含HTML标签
  const htmlTagRegex = /<[^>]*>/g;
  const htmlTags = content.match(htmlTagRegex);

  if (htmlTags && htmlTags.length > 0) {
    console.warn('Content contains HTML tags, this may cause formatting issues:', htmlTags.slice(0, 5));

    // 基本的HTML清理 - 移除常见的HTML实体编码
    let cleanedContent = content
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x3C;/g, '<')
      .replace(/&#x3E;/g, '>');

    return cleanedContent;
  }

  return content;
}

// 创建新的博客文章
export async function createPost(postData: Omit<BlogPost, 'id'> & { content: string }): Promise<{ success: boolean; message?: string; post?: BlogPost }> {
  try {
    // 获取所有现有文章以确定新ID
    const allPosts = fs.readdirSync(postsDirectory)
      .filter(fileName => fileName.endsWith('.md'))
      .map(fileName => {
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const matterResult = matter(fileContents);
        return {
          id: matterResult.data.id as number
        };
      });

    // 找出最大ID并加1
    const maxId = allPosts.length > 0 
      ? Math.max(...allPosts.map(post => post.id))
      : 0;
    const newId = maxId + 1;

    // 准备文章数据
    const { title, excerpt, date, categories, content } = postData;
    const slug = postData.slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    // 验证和清理内容
    const cleanedContent = validateAndCleanContent(content);

    // 创建frontmatter
    const frontmatter = {
      id: newId,
      title,
      excerpt,
      date,
      slug,
      categories
    };

    // 创建文件内容
    const fileContent = `---
${Object.entries(frontmatter).map(([key, value]) => {
  if (Array.isArray(value)) {
    return `${key}: ${JSON.stringify(value)}`;
  }
  return `${key}: "${value}"`;
}).join('\n')}
---

${cleanedContent}`;

    // 写入文件
    const filePath = path.join(postsDirectory, `${slug}.md`);
    fs.writeFileSync(filePath, fileContent);

    return {
      success: true,
      post: { ...frontmatter, content }
    };
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
    const filePath = path.join(postsDirectory, `${slug}.md`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `Post with slug "${slug}" not found`
      };
    }

    // 读取现有文件
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const matterResult = matter(fileContents);
    
    // 准备更新的数据
    const updatedFrontmatter = {
      ...matterResult.data,
      ...postData
    };

    // 如果slug被更改，需要重命名文件
    const newSlug = postData.slug || slug;
    const newFilePath = newSlug !== slug 
      ? path.join(postsDirectory, `${newSlug}.md`) 
      : filePath;

    // 创建更新后的文件内容
    const rawUpdatedContent = postData.content !== undefined
      ? postData.content
      : matterResult.content;

    // 验证和清理内容
    const updatedContent = validateAndCleanContent(rawUpdatedContent);

    // 创建文件内容
    const fileContent = `---
${Object.entries(updatedFrontmatter).map(([key, value]) => {
  if (Array.isArray(value)) {
    return `${key}: ${JSON.stringify(value)}`;
  }
  return `${key}: "${value}"`;
}).join('\n')}
---

${updatedContent}`;

    // 写入文件
    fs.writeFileSync(newFilePath, fileContent);

    // 如果文件名改变，删除旧文件
    if (newFilePath !== filePath) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      post: { 
        ...updatedFrontmatter as BlogPost, 
        content: updatedContent 
      }
    };
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
    const filePath = path.join(postsDirectory, `${slug}.md`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `Post with slug "${slug}" not found`
      };
    }

    // 删除文件
    fs.unlinkSync(filePath);

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting post:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// 简单的身份验证检查（在实际应用中应使用更安全的方法）
export function checkAuth(authToken?: string): boolean {
  // 这里应该使用环境变量和更安全的验证方法
  // 这只是一个简单的示例
  const validToken = process.env.BLOG_ADMIN_TOKEN || 'your-secret-token';
  return authToken === validToken;
}
