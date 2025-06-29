import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';

// 导入常用语言支持
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';

// 处理代码块高亮
function highlightCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
    (match, language, code) => {
      try {
        // 解码HTML实体
        const decodedCode = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        // 检查语言是否支持
        if (Prism.languages[language]) {
          const highlightedCode = Prism.highlight(
            decodedCode,
            Prism.languages[language],
            language
          );
          
          return `<pre class="language-${language}"><code class="language-${language}">${highlightedCode}</code></pre>`;
        } else {
          // 如果语言不支持，返回原始代码块但添加样式类
          return `<pre class="language-text"><code class="language-text">${code}</code></pre>`;
        }
      } catch (error) {
        console.warn(`Error highlighting code for language ${language}:`, error);
        return `<pre class="language-text"><code class="language-text">${code}</code></pre>`;
      }
    }
  );
}

// 处理图片优化
function optimizeImages(html: string): string {
  return html.replace(
    /<img([^>]*?)src="([^"]*?)"([^>]*?)>/g,
    (match, beforeSrc, src, afterSrc) => {
      // 添加懒加载和响应式类
      const lazyLoading = 'loading="lazy"';
      const responsiveClass = 'class="max-w-full h-auto rounded-lg shadow-md"';
      
      // 检查是否已经有class属性
      if (afterSrc.includes('class=')) {
        return `<img${beforeSrc}src="${src}"${afterSrc} ${lazyLoading}>`;
      } else {
        return `<img${beforeSrc}src="${src}"${afterSrc} ${lazyLoading} ${responsiveClass}>`;
      }
    }
  );
}

// 主要的Markdown处理函数
export async function processMarkdown(markdownContent: string): Promise<string> {
  try {
    // 使用remark将Markdown转换为HTML，支持GitHub Flavored Markdown
    const processedContent = await remark()
      .use(remarkGfm) // 支持表格、删除线、任务列表等GFM功能
      .use(html, { sanitize: false }) // 允许HTML标签以支持代码高亮
      .process(markdownContent);
    
    let htmlContent = processedContent.toString();
    
    // 应用代码高亮
    htmlContent = highlightCodeBlocks(htmlContent);
    
    // 优化图片
    htmlContent = optimizeImages(htmlContent);
    
    return htmlContent;
  } catch (error) {
    console.error('Error processing markdown:', error);
    return markdownContent; // 返回原始内容作为后备
  }
}
