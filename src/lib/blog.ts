import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

// 博客文章目录路径
const postsDirectory = path.join(process.cwd(), 'src/data/blog');

// 博客文章类型定义
export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  categories: string[];
  content?: string;
}

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

      // 返回带有前置元数据的对象
      return {
        id: matterResult.data.id,
        title: matterResult.data.title,
        excerpt: matterResult.data.excerpt,
        date: matterResult.data.date,
        slug: matterResult.data.slug,
        categories: matterResult.data.categories,
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
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);

    // 使用remark将Markdown转换为HTML
    const processedContent = await remark()
      .use(html)
      .process(matterResult.content);
    const contentHtml = processedContent.toString();

    // 返回带有内容的博客文章数据
    return {
      id: matterResult.data.id,
      title: matterResult.data.title,
      excerpt: matterResult.data.excerpt,
      date: matterResult.data.date,
      slug: matterResult.data.slug,
      categories: matterResult.data.categories,
      content: contentHtml
    };
  } catch (error) {
    console.error(`Error getting post by slug ${slug}:`, error);
    return null;
  }
}

// 获取所有分类
export function getAllCategories(): string[] {
  const { posts } = getAllPosts(1, 1000); // 获取足够多的文章以包含所有分类

  // 收集所有分类
  const categoriesSet = new Set<string>();
  posts.forEach((post: BlogPost) => {
    post.categories.forEach((category: string) => {
      categoriesSet.add(category);
    });
  });

  // 转换为数组并按字母顺序排序
  return Array.from(categoriesSet).sort();
}

// 根据分类获取博客文章
export function getPostsByCategory(category: string): BlogPost[] {
  const { posts } = getAllPosts(1, 1000); // 获取足够多的文章

  // 过滤出包含指定分类的文章
  return posts.filter((post: BlogPost) =>
    post.categories.some((cat: string) =>
      cat.toLowerCase() === category.toLowerCase()
    )
  );
}

// 搜索博客文章
export function searchPosts(query: string): BlogPost[] {
  if (!query || query.trim() === '') {
    return [];
  }

  const { posts } = getAllPosts(1, 1000); // 获取足够多的文章
  const searchTerm = query.toLowerCase();

  // 搜索标题、摘要和分类
  return posts.filter((post: BlogPost) =>
    post.title.toLowerCase().includes(searchTerm) ||
    post.excerpt.toLowerCase().includes(searchTerm) ||
    post.categories.some((category: string) =>
      category.toLowerCase().includes(searchTerm)
    )
  );
}

// 获取相关文章
export function getRelatedPosts(currentPost: BlogPost, limit: number = 3): BlogPost[] {
  const { posts } = getAllPosts(1, 1000); // 获取足够多的文章

  // 过滤掉当前文章，并找出有共同分类的文章
  const relatedPosts = posts
    .filter((post: BlogPost) => post.id !== currentPost.id)
    .filter((post: BlogPost) =>
      post.categories.some((category: string) =>
        currentPost.categories.includes(category)
      )
    )
    .slice(0, limit);

  return relatedPosts;
}
