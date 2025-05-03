// AI提示模板
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  deepseekTemplate?: string; // Deepseek特定的模板
  models?: string[]; // 适用的模型列表
}

// 预定义的提示模板
export const promptTemplates: PromptTemplate[] = [
  {
    id: 'full-article',
    name: 'Full Article',
    description: 'Generate a complete blog post with introduction, main points, and conclusion',
    template: 'Write a comprehensive blog post about "{title}". Include an engaging introduction, 3-5 main sections with subheadings, and a conclusion. The tone should be {tone} and target audience is {audience}.',
    deepseekTemplate: 'You are a professional blog writer. Write a comprehensive, well-structured blog post about "{title}". The post should include:\n\n1. An engaging introduction that hooks the reader\n2. 3-5 main sections with clear subheadings\n3. Relevant examples or data points in each section\n4. A conclusion that summarizes key points and provides a call to action\n\nThe tone should be {tone} and the target audience is {audience}. Use markdown formatting for headings and structure.'
  },
  {
    id: 'article-outline',
    name: 'Article Outline',
    description: 'Generate an outline with main points and subheadings',
    template: 'Create a detailed outline for a blog post about "{title}". Include a suggested introduction, main sections with bullet points for key ideas to cover in each section, and a conclusion.',
    deepseekTemplate: 'You are a content strategist. Create a detailed, well-structured outline for a blog post about "{title}". The outline should include:\n\n1. A suggested introduction approach\n2. 4-6 main sections with clear, engaging headings\n3. 3-5 bullet points under each section describing key ideas to cover\n4. A suggested conclusion approach\n\nUse markdown formatting for the outline structure.'
  },
  {
    id: 'introduction',
    name: 'Introduction',
    description: 'Generate an engaging introduction for your article',
    template: 'Write an engaging introduction for a blog post about "{title}". The introduction should hook the reader, provide context about why this topic matters, and briefly outline what the article will cover.',
    deepseekTemplate: 'You are a professional writer specializing in blog introductions. Write an engaging, compelling introduction for a blog post titled "{title}". The introduction should:\n\n1. Start with a hook that grabs the reader\'s attention (question, statistic, story, or bold statement)\n2. Establish why this topic matters to the reader\n3. Provide necessary context or background information\n4. Briefly outline what the article will cover\n5. Be approximately 150-200 words in length\n\nMake the introduction conversational yet professional, and ensure it creates interest that makes readers want to continue reading.'
  },
  {
    id: 'conclusion',
    name: 'Conclusion',
    description: 'Generate a conclusion that summarizes key points',
    template: 'Write a conclusion for a blog post about "{title}". Summarize the main points discussed in the article, emphasize the key takeaways, and end with a thought-provoking statement or call to action.',
    deepseekTemplate: 'You are a professional content writer. Write a strong, effective conclusion for a blog post about "{title}". The conclusion should:\n\n1. Briefly summarize the main points discussed in the article without simply repeating them\n2. Emphasize 2-3 key takeaways the reader should remember\n3. End with either a thought-provoking statement, a call to action, or a forward-looking statement\n4. Be approximately 150-200 words in length\n\nThe conclusion should provide a sense of closure while also encouraging the reader to take action or think further about the topic.'
  },
  {
    id: 'seo-optimization',
    name: 'SEO Optimization',
    description: 'Suggest SEO improvements for your article',
    template: 'Analyze the following blog post title and excerpt for SEO optimization: Title: "{title}", Excerpt: "{excerpt}". Suggest improvements to the title, meta description, and keywords to improve search engine ranking. Also suggest 3-5 related keywords that could be incorporated into the content.',
    deepseekTemplate: 'You are an SEO expert. Analyze the following blog post information for SEO optimization:\n\nTitle: "{title}"\nExcerpt: "{excerpt}"\n\nProvide a detailed analysis including:\n\n1. Title evaluation and 2-3 alternative title suggestions that are more SEO-friendly\n2. Meta description evaluation and an improved version (under 160 characters)\n3. 5-7 primary and secondary keywords that should be targeted\n4. 3 suggestions for improving content structure for better SEO\n5. Recommendations for internal and external linking strategies\n\nFormat your response with clear headings and bullet points for each section.'
  },
  {
    id: 'rewrite',
    name: 'Rewrite Content',
    description: 'Rewrite existing content to improve clarity and engagement',
    template: 'Rewrite the following content to improve clarity, engagement, and flow while maintaining the same information: {content}',
    deepseekTemplate: 'You are a professional editor and content improver. Rewrite the following content to significantly improve its clarity, engagement, and flow while maintaining all the key information and main points. Make the content more compelling and easier to read by:\n\n1. Improving sentence structure and variety\n2. Enhancing transitions between ideas\n3. Using more engaging language and active voice\n4. Breaking up long paragraphs where appropriate\n5. Adding subheadings if helpful for structure\n\nHere is the content to rewrite:\n\n{content}\n\nProvide only the rewritten content without explanations or comments.'
  },
  {
    id: 'technical-article',
    name: 'Technical Article',
    description: 'Generate a technical article with code examples and explanations',
    template: 'Write a technical article about "{title}" for developers. Include code examples, explanations, and best practices.',
    deepseekTemplate: 'You are a technical writer with expertise in software development. Write a comprehensive technical article about "{title}" for a developer audience. The article should include:\n\n1. A brief introduction explaining the concept and its importance\n2. Clear explanations of core technical concepts\n3. Practical code examples that demonstrate implementation\n4. Best practices and common pitfalls to avoid\n5. Performance considerations where relevant\n6. A conclusion summarizing key takeaways\n\nUse markdown formatting for structure, and format all code examples with appropriate syntax highlighting. The tone should be professional but accessible, assuming the reader has basic programming knowledge but may be new to this specific topic.'
  },
  {
    id: 'tutorial',
    name: 'Step-by-Step Tutorial',
    description: 'Create a detailed tutorial with step-by-step instructions',
    template: 'Create a step-by-step tutorial on how to "{title}". Include prerequisites, detailed instructions, and troubleshooting tips.',
    deepseekTemplate: 'You are a technical educator. Create a comprehensive, step-by-step tutorial on how to "{title}". The tutorial should include:\n\n1. An introduction explaining what will be accomplished and why it\'s valuable\n2. A clear list of prerequisites (tools, knowledge, etc.)\n3. A materials/requirements section if applicable\n4. Numbered steps with detailed instructions for each\n5. Screenshots or descriptions of what the user should see at key points\n6. Code snippets where applicable, with explanations\n7. Common issues and troubleshooting tips\n8. A conclusion with next steps or related topics to explore\n\nUse markdown formatting for structure and ensure the instructions are clear enough for beginners to follow.'
  }
];

// 获取提示模板
export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return promptTemplates.find(template => template.id === id);
}

// 填充提示模板
export function fillPromptTemplate(
  template: string,
  variables: Record<string, string>,
  useDeepseek: boolean = false,
  templateObj?: PromptTemplate
): string {
  // 如果使用Deepseek模板且提供了模板对象且有Deepseek特定模板，则使用Deepseek模板
  let templateToUse = template;
  if (useDeepseek && templateObj?.deepseekTemplate) {
    templateToUse = templateObj.deepseekTemplate;
  }

  let filledTemplate = templateToUse;

  // 替换模板变量
  Object.entries(variables).forEach(([key, value]) => {
    filledTemplate = filledTemplate.replace(new RegExp(`{${key}}`, 'g'), value);
  });

  return filledTemplate;
}
