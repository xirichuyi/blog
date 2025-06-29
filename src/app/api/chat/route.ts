import { NextRequest, NextResponse } from 'next/server';
import { generateWithDeepseek } from '@/lib/deepseek-api';
import { getAllPosts, getPostBySlug, searchPosts } from '@/lib/blog-server';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Message[];
}

// Cyrus的个人信息和背景（你可以根据实际情况修改）
const CYRUS_CONTEXT = `
You are Cyrus's AI assistant on his personal blog. Here's what you should know about Cyrus:

ABOUT CYRUS:
- A passionate software engineer and technology enthusiast
- Specializes in full-stack development, AI/ML, and modern web technologies
- Experienced with React, Next.js, TypeScript, Python, and various cloud platforms
- Enjoys writing about technology trends, programming tutorials, and personal insights
- Values clean code, user experience, and continuous learning
- Contact: xrcy123@gmail.com

BLOG INFORMATION:
- This is Cyrus's personal blog where he shares technical articles and insights
- The blog covers topics like web development, AI, programming best practices, and tech industry trends
- Built with Next.js, React, TypeScript, and Tailwind CSS
- Features include dark mode, search functionality, categorized posts, and admin management
- GitHub: https://github.com/xirichuyi (Cyrus's open source projects and contributions)

YOUR ROLE:
- Act as Cyrus's personal AI assistant and representative
- Help visitors learn about Cyrus and his work
- Provide guidance on navigating the blog
- Answer technical questions based on Cyrus's expertise
- Be friendly, professional, and helpful
- If asked about specific blog posts, you can mention that visitors can browse the blog or use the search function

CONVERSATION STYLE:
- Be conversational and approachable
- Show enthusiasm for technology and learning
- Provide helpful and accurate information
- If you don't know something specific about Cyrus, be honest and suggest ways to find the information
- Keep responses concise but informative
`;

// 博客内容检索服务
async function retrieveBlogContent(userMessage: string) {
  const lowerMessage = userMessage.toLowerCase();
  let relevantContent = '';

  try {
    // 检查是否询问最新文章或热门文章
    if (lowerMessage.includes('latest') || lowerMessage.includes('recent') || lowerMessage.includes('new') ||
        lowerMessage.includes('热门') || lowerMessage.includes('最新') || lowerMessage.includes('popular')) {

      const { posts } = getAllPosts(1, 5); // 获取最新5篇文章
      if (posts.length > 0) {
        relevantContent += '\n**Latest Blog Posts:**\n';
        posts.forEach(post => {
          relevantContent += `- "${post.title}" (${post.date})\n  ${post.excerpt}\n  Categories: ${post.categories.join(', ')}\n\n`;
        });
      }
    }

    // 检查是否询问网站统计信息
    if (lowerMessage.includes('how many') || lowerMessage.includes('total') || lowerMessage.includes('statistics') ||
        lowerMessage.includes('overview') || lowerMessage.includes('统计') || lowerMessage.includes('总共')) {

      const { posts, totalPosts } = getAllPosts(1, 1000); // 获取所有文章
      const categories = [...new Set(posts.flatMap(post => post.categories))]; // 获取所有分类

      relevantContent += '\n**Blog Statistics:**\n';
      relevantContent += `- Total Articles: ${totalPosts}\n`;
      relevantContent += `- Categories: ${categories.length} (${categories.join(', ')})\n`;
      relevantContent += `- Latest Update: ${posts.length > 0 ? posts[0].date : 'N/A'}\n\n`;
    }

    // 检查是否询问特定主题
    const searchTerms = [];
    if (lowerMessage.includes('react') || lowerMessage.includes('javascript')) searchTerms.push('react', 'javascript');
    if (lowerMessage.includes('python') || lowerMessage.includes('machine learning') || lowerMessage.includes('ai')) searchTerms.push('python', 'machine learning', 'ai');
    if (lowerMessage.includes('business') || lowerMessage.includes('strategy')) searchTerms.push('business', 'strategy');
    if (lowerMessage.includes('leadership') || lowerMessage.includes('team')) searchTerms.push('leadership', 'team');
    if (lowerMessage.includes('communication') || lowerMessage.includes('remote')) searchTerms.push('communication', 'remote');

    // 如果找到相关主题，搜索相关文章
    if (searchTerms.length > 0) {
      for (const term of searchTerms) {
        const searchResults = searchPosts(term);
        if (searchResults.length > 0) {
          relevantContent += `\n**Articles about "${term}":**\n`;
          searchResults.slice(0, 3).forEach(post => {
            relevantContent += `- "${post.title}" (${post.date})\n  ${post.excerpt}\n  Categories: ${post.categories.join(', ')}\n\n`;
          });
          break; // 只显示第一个匹配主题的结果
        }
      }
    }

    // 如果用户询问具体文章内容，尝试获取文章详情
    if (lowerMessage.includes('tell me about') || lowerMessage.includes('explain') ||
        lowerMessage.includes('what is') || lowerMessage.includes('how to')) {

      // 尝试搜索相关文章并获取内容
      const searchQuery = userMessage.replace(/tell me about|explain|what is|how to/gi, '').trim();
      if (searchQuery.length > 3) {
        const searchResults = searchPosts(searchQuery);
        if (searchResults.length > 0) {
          const firstResult = searchResults[0];
          const fullPost = await getPostBySlug(firstResult.slug);
          if (fullPost && fullPost.content) {
            relevantContent += `\n**Relevant Article Content from "${fullPost.title}":**\n`;
            // 获取文章内容的前500个字符
            const contentPreview = fullPost.content.substring(0, 500) + '...';
            relevantContent += contentPreview + '\n\n';
          }
        }
      }
    }

  } catch (error) {
    console.error('Error retrieving blog content:', error);
  }

  return relevantContent;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // 检索相关博客内容
    const blogContent = await retrieveBlogContent(message);

    // 构建对话上下文
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = conversationHistory
        .slice(-5) // 只取最近5条消息
        .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
    }

    // 构建完整的prompt
    const fullPrompt = `${CYRUS_CONTEXT}

${blogContent ? `Relevant Blog Content:\n${blogContent}\n` : ''}

${conversationContext ? `Previous conversation:\n${conversationContext}\n` : ''}

User: ${message}

Please respond as Cyrus's AI assistant. Be helpful, friendly, and informative. If you have relevant blog content above, reference it naturally in your response. Keep your response concise but comprehensive.`;

    // 尝试使用Deepseek API
    try {
      // 从localStorage或环境变量获取API密钥
      const apiKey = process.env.DEEPSEEK_API_KEY || '';
      
      if (!apiKey) {
        throw new Error('Deepseek API key not configured');
      }

      const response = await generateWithDeepseek({
        apiKey,
        model: 'deepseek-chat',
        prompt: fullPrompt,
        temperature: 0.7,
        maxTokens: 500
      });

      return NextResponse.json({ response });
    } catch (deepseekError) {
      console.error('Deepseek API error:', deepseekError);
      
      // 如果Deepseek API失败，使用预设回复
      const fallbackResponse = generateFallbackResponse(message);
      return NextResponse.json({ response: fallbackResponse });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 预设回复函数，当AI API不可用时使用
function generateFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  // 关于Cyrus的问题
  if (lowerMessage.includes('about cyrus') || lowerMessage.includes('who is cyrus') || lowerMessage.includes('tell me about')) {
    return `Cyrus is a passionate software engineer and technology enthusiast. He specializes in full-stack development, AI/ML, and modern web technologies. He loves sharing his knowledge through this blog, covering topics like web development, programming best practices, and tech industry insights. You can learn more about him in the About section of this blog!`;
  }

  // 技术技能相关
  if (lowerMessage.includes('technical skills') || lowerMessage.includes('technologies') || lowerMessage.includes('programming') || lowerMessage.includes('skills') || lowerMessage.includes('tech')) {
    return `Cyrus has expertise in various technologies including React, Next.js, TypeScript, Python, and cloud platforms. He's particularly passionate about modern web development, AI/ML applications, and creating great user experiences. You can find detailed technical articles and tutorials throughout his blog posts!`;
  }

  // 博客相关
  if (lowerMessage.includes('blog') || lowerMessage.includes('posts') || lowerMessage.includes('articles') || lowerMessage.includes('recent') || lowerMessage.includes('latest')) {
    return `This blog features Cyrus's thoughts and tutorials on technology, programming, and software development. You can browse recent posts on the Blog page, explore different Categories, or use the Search function to find specific topics. The blog covers everything from beginner tutorials to advanced technical concepts!`;
  }

  // 联系方式
  if (lowerMessage.includes('contact') || lowerMessage.includes('reach') || lowerMessage.includes('email') || lowerMessage.includes('connect')) {
    return `You can reach Cyrus at **xrcy123@gmail.com**. He's always open to connecting with fellow developers and tech enthusiasts! You can also check out his GitHub at https://github.com/xirichuyi for his open-source projects.`;
  }

  // 问候语
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('good')) {
    return `Hello! Welcome to Cyrus's blog! I'm his AI assistant and I'm here to help you explore the content and learn more about Cyrus. What would you like to know about?`;
  }

  // 帮助相关
  if (lowerMessage.includes('help') || lowerMessage.includes('assist') || lowerMessage.includes('what can you') || lowerMessage.includes('how can')) {
    return `I can help you with several things: learn about Cyrus's background and expertise, navigate the blog content, find specific articles or topics, and answer questions about web development and technology. What interests you most?`;
  }

  // 项目相关
  if (lowerMessage.includes('project') || lowerMessage.includes('work') || lowerMessage.includes('portfolio')) {
    return `Cyrus has worked on various projects spanning web development, AI/ML applications, and modern software solutions. You can find examples of his work and detailed case studies throughout the blog posts. Check out the Categories section to explore projects by topic!`;
  }

  // 学习相关
  if (lowerMessage.includes('learn') || lowerMessage.includes('tutorial') || lowerMessage.includes('guide') || lowerMessage.includes('how to')) {
    return `Great question! This blog is full of learning resources. Cyrus regularly shares tutorials, guides, and insights on web development, programming best practices, and emerging technologies. Use the Search function or browse by Categories to find tutorials that match your interests!`;
  }

  // 默认回复 - 更智能的回复
  const responses = [
    `Thanks for your message! I'm here to help you learn more about Cyrus and navigate his blog. You can ask me about his background, technical expertise, blog content, or how to find specific information. Feel free to explore the blog's different sections - there's lots of great content to discover!`,
    `I'd be happy to help! You can ask me about Cyrus's technical background, recent blog posts, specific technologies, or how to navigate the site. What would you like to know more about?`,
    `Welcome! I'm Cyrus's AI assistant. I can help you discover his latest articles, learn about his expertise in web development and AI, or guide you to specific content. What brings you to the blog today?`
  ];

  // 随机选择一个回复以增加变化
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function GET() {
  return NextResponse.json(
    { message: 'Chat API is working. Use POST to send messages.' },
    { status: 200 }
  );
}
