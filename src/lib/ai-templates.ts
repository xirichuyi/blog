// AI提示模板
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
}

// 预定义的提示模板
export const promptTemplates: PromptTemplate[] = [
  {
    id: 'full-article',
    name: 'Full Article',
    description: 'Generate a complete blog post with introduction, main points, and conclusion',
    template: 'Write a comprehensive blog post about "{title}". Include an engaging introduction, 3-5 main sections with subheadings, and a conclusion. The tone should be {tone} and target audience is {audience}.'
  },
  {
    id: 'article-outline',
    name: 'Article Outline',
    description: 'Generate an outline with main points and subheadings',
    template: 'Create a detailed outline for a blog post about "{title}". Include a suggested introduction, main sections with bullet points for key ideas to cover in each section, and a conclusion.'
  },
  {
    id: 'introduction',
    name: 'Introduction',
    description: 'Generate an engaging introduction for your article',
    template: 'Write an engaging introduction for a blog post about "{title}". The introduction should hook the reader, provide context about why this topic matters, and briefly outline what the article will cover.'
  },
  {
    id: 'conclusion',
    name: 'Conclusion',
    description: 'Generate a conclusion that summarizes key points',
    template: 'Write a conclusion for a blog post about "{title}". Summarize the main points discussed in the article, emphasize the key takeaways, and end with a thought-provoking statement or call to action.'
  },
  {
    id: 'seo-optimization',
    name: 'SEO Optimization',
    description: 'Suggest SEO improvements for your article',
    template: 'Analyze the following blog post title and excerpt for SEO optimization: Title: "{title}", Excerpt: "{excerpt}". Suggest improvements to the title, meta description, and keywords to improve search engine ranking. Also suggest 3-5 related keywords that could be incorporated into the content.'
  },
  {
    id: 'rewrite',
    name: 'Rewrite Content',
    description: 'Rewrite existing content to improve clarity and engagement',
    template: 'Rewrite the following content to improve clarity, engagement, and flow while maintaining the same information: {content}'
  }
];

// 获取提示模板
export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return promptTemplates.find(template => template.id === id);
}

// 填充提示模板
export function fillPromptTemplate(template: string, variables: Record<string, string>): string {
  let filledTemplate = template;
  
  // 替换模板变量
  Object.entries(variables).forEach(([key, value]) => {
    filledTemplate = filledTemplate.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  
  return filledTemplate;
}
