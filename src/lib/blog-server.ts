import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BlogPost } from './blog-types';
import { processMarkdown } from './markdown-processor';

// 博客文章目录路径
const postsDirectory = path.join(process.cwd(), 'src/data/blog');

// 获取所有博客文章
export function getAllPosts(page: number = 1, postsPerPage: number = 6): { posts: BlogPost[], totalPosts: number, totalPages: number } {
  // 获取目录中的所有文件名
  const fileNames = fs.readdirSync(postsDirectory);

  // 获取每个文件的数据
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      // 读取文件内容
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');

      // 使用gray-matter解析文件的前置元数据
      const matterResult = matter(fileContents);

      // 返回带有前置元数据的对象，确保 categories 始终是数组
      return {
        id: matterResult.data.id,
        title: matterResult.data.title,
        excerpt: matterResult.data.excerpt,
        date: matterResult.data.date,
        slug: matterResult.data.slug,
        categories: Array.isArray(matterResult.data.categories)
          ? matterResult.data.categories
          : (matterResult.data.categories ? [matterResult.data.categories] : []),
      } as BlogPost;
    });

  // 按日期排序，最新的文章排在前面
  const sortedPosts = allPostsData.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  // 计算分页信息
  const totalPosts = sortedPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  // 确保页码在有效范围内
  const validPage = Math.max(1, Math.min(page, totalPages || 1));

  // 获取当前页的文章
  const startIndex = (validPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const paginatedPosts = sortedPosts.slice(startIndex, endIndex);

  return {
    posts: paginatedPosts,
    totalPosts,
    totalPages
  };
}

// 获取所有博客文章的slug
export function getAllPostSlugs() {
  const fileNames = fs.readdirSync(postsDirectory);

  return fileNames.map(fileName => {
    return {
      params: {
        slug: fileName.replace(/\.md$/, '')
      }
    };
  });
}

// 根据slug获取博客文章数据
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);

    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      console.warn(`Blog post file not found: ${fullPath}`);
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');

    let matterResult;
    try {
      matterResult = matter(fileContents);
    } catch (yamlError) {
      console.error(`YAML parsing error in file ${slug}.md:`, yamlError);
      console.error(`File content preview:`, fileContents.substring(0, 500));
      return null;
    }

    // 验证必要的前置元数据字段
    const requiredFields = ['id', 'title', 'excerpt', 'date', 'slug', 'categories'];
    const missingFields = requiredFields.filter(field => !matterResult.data[field]);

    if (missingFields.length > 0) {
      console.error(`Missing required fields in ${slug}.md:`, missingFields);
      return null;
    }

    // 确保 categories 是数组
    const categories = Array.isArray(matterResult.data.categories)
      ? matterResult.data.categories
      : (matterResult.data.categories ? [matterResult.data.categories] : []);

    // 使用增强的Markdown处理器转换为HTML
    let contentHtml;
    try {
      contentHtml = await processMarkdown(matterResult.content);
    } catch (markdownError) {
      console.error(`Markdown processing error in ${slug}.md:`, markdownError);
      // 降级处理：使用原始内容
      contentHtml = matterResult.content;
    }

    // 返回带有内容的博客文章数据
    return {
      id: matterResult.data.id,
      title: matterResult.data.title,
      excerpt: matterResult.data.excerpt,
      date: matterResult.data.date,
      slug: matterResult.data.slug,
      categories: categories,
      content: contentHtml
    };
  } catch (error) {
    console.error(`Error getting post by slug ${slug}:`, error);
    return null;
  }
}

// 获取所有分类
export function getAllCategories(): string[] {
  try {
    const { posts } = getAllPosts(1, 1000); // 获取足够多的文章以包含所有分类

    // 收集所有分类
    const categoriesSet = new Set<string>();
    posts.forEach((post: BlogPost) => {
      // 安全检查：确保 categories 是数组且不为空
      if (Array.isArray(post.categories) && post.categories.length > 0) {
        post.categories.forEach((category: string) => {
          if (category && typeof category === 'string') {
            categoriesSet.add(category.trim());
          }
        });
      }
    });

    // 转换为数组并按字母顺序排序
    return Array.from(categoriesSet).sort();
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    return []; // 返回空数组作为降级处理
  }
}

// 根据分类获取博客文章
export function getPostsByCategory(category: string): BlogPost[] {
  try {
    const { posts } = getAllPosts(1, 1000); // 获取足够多的文章

    // 过滤出包含指定分类的文章
    return posts.filter((post: BlogPost) => {
      // 安全检查：确保 categories 是数组
      if (!Array.isArray(post.categories)) {
        return false;
      }
      return post.categories.some((cat: string) =>
        cat && typeof cat === 'string' &&
        cat.toLowerCase().trim() === category.toLowerCase().trim()
      );
    });
  } catch (error) {
    console.error('Error in getPostsByCategory:', error);
    return []; // 返回空数组作为降级处理
  }
}

// 搜索博客文章
export function searchPosts(query: string): BlogPost[] {
  if (!query || query.trim() === '') {
    return [];
  }

  try {
    const { posts } = getAllPosts(1, 1000); // 获取足够多的文章
    const searchTerm = query.toLowerCase().trim();

    // 搜索标题、摘要和分类
    return posts.filter((post: BlogPost) => {
      const titleMatch = post.title && post.title.toLowerCase().includes(searchTerm);
      const excerptMatch = post.excerpt && post.excerpt.toLowerCase().includes(searchTerm);

      // 安全检查分类搜索
      const categoryMatch = Array.isArray(post.categories) &&
        post.categories.some((category: string) =>
          category && typeof category === 'string' &&
          category.toLowerCase().includes(searchTerm)
        );

      return titleMatch || excerptMatch || categoryMatch;
    });
  } catch (error) {
    console.error('Error in searchPosts:', error);
    return []; // 返回空数组作为降级处理
  }
}

// 获取相关文章
export function getRelatedPosts(currentPost: BlogPost, limit: number = 3): BlogPost[] {
  try {
    const { posts } = getAllPosts(1, 1000); // 获取足够多的文章

    // 安全检查当前文章的分类
    if (!Array.isArray(currentPost.categories)) {
      return [];
    }

    // 过滤掉当前文章，并找出有共同分类的文章
    const relatedPosts = posts
      .filter((post: BlogPost) => post.id !== currentPost.id)
      .filter((post: BlogPost) => {
        // 安全检查：确保两个文章的 categories 都是数组
        if (!Array.isArray(post.categories)) {
          return false;
        }
        return post.categories.some((category: string) =>
          category && typeof category === 'string' &&
          currentPost.categories.includes(category)
        );
      })
      .slice(0, limit);

    return relatedPosts;
  } catch (error) {
    console.error('Error in getRelatedPosts:', error);
    return []; // 返回空数组作为降级处理
  }
}
