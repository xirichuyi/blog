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
export function getAllPosts(): BlogPost[] {
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
  return allPostsData.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
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
  const posts = getAllPosts();

  // 收集所有分类
  const categoriesSet = new Set<string>();
  posts.forEach(post => {
    post.categories.forEach(category => {
      categoriesSet.add(category);
    });
  });

  // 转换为数组并按字母顺序排序
  return Array.from(categoriesSet).sort();
}

// 根据分类获取博客文章
export function getPostsByCategory(category: string): BlogPost[] {
  const allPosts = getAllPosts();

  // 过滤出包含指定分类的文章
  return allPosts.filter(post =>
    post.categories.some(cat =>
      cat.toLowerCase() === category.toLowerCase()
    )
  );
}

// 搜索博客文章
export function searchPosts(query: string): BlogPost[] {
  if (!query || query.trim() === '') {
    return [];
  }

  const allPosts = getAllPosts();
  const searchTerm = query.toLowerCase();

  // 搜索标题、摘要和分类
  return allPosts.filter(post =>
    post.title.toLowerCase().includes(searchTerm) ||
    post.excerpt.toLowerCase().includes(searchTerm) ||
    post.categories.some(category =>
      category.toLowerCase().includes(searchTerm)
    )
  );
}

// 获取相关文章
export function getRelatedPosts(currentPost: BlogPost, limit: number = 3): BlogPost[] {
  const allPosts = getAllPosts();

  // 过滤掉当前文章，并找出有共同分类的文章
  const relatedPosts = allPosts
    .filter(post => post.id !== currentPost.id)
    .filter(post =>
      post.categories.some(category =>
        currentPost.categories.includes(category)
      )
    )
    .slice(0, limit);

  return relatedPosts;
}
