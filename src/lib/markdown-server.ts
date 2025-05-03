import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// 博客文章目录路径
const postsDirectory = path.join(process.cwd(), 'src/data/blog');

// 获取博客文章的原始Markdown内容
export async function getPostMarkdown(slug: string): Promise<{ content: string } | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { content } = matter(fileContents);
    
    return { content };
  } catch (error) {
    console.error(`Error fetching markdown content for slug ${slug}:`, error);
    return null;
  }
}
