import { NextRequest, NextResponse } from 'next/server';
import { generateWithDeepseek } from '@/lib/deepseek-api';
import { getAllPosts, getPostBySlug, searchPosts, getPostsByCategory } from '@/lib/blog-server';

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
- When mentioning blog posts, always provide clickable links using this format: [Article Title](/blog/slug)
- If you have relevant blog content in your context, reference specific articles with their links

CONVERSATION STYLE:
- Be conversational and approachable
- Show enthusiasm for technology and learning
- Provide helpful and accurate information
- If you don't know something specific about Cyrus, be honest and suggest ways to find the information
- Keep responses concise but informative
`;

// 搜索指令接口
interface SearchInstruction {
  action: 'search_all' | 'search_latest' | 'search_topic' | 'search_category' | 'no_search';
  query?: string;
  limit?: number;
}

// AI意图分析函数
async function analyzeUserIntent(userMessage: string): Promise<SearchInstruction> {
  const intentPrompt = `Analyze the user's message and determine if they want to search for blog articles.
Respond with ONLY a JSON object in this exact format:

{
  "action": "search_all" | "search_latest" | "search_topic" | "search_category" | "no_search",
  "query": "search terms if applicable",
  "limit": number (optional, default 5)
}

Actions:
- "search_all": User wants to see all articles/complete list
- "search_latest": User wants recent/latest articles
- "search_topic": User wants articles about specific topic/keyword
- "search_category": User wants articles from specific category
- "no_search": User is not asking for articles

User message: "${userMessage}"

JSON response:`;

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    if (!apiKey) {
      return { action: 'no_search' };
    }

    const response = await generateWithDeepseek({
      apiKey,
      model: 'deepseek-chat',
      prompt: intentPrompt,
      temperature: 0.1,
      maxTokens: 100
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const instruction = JSON.parse(jsonMatch[0]) as SearchInstruction;
      return instruction;
    }
  } catch (error) {
    console.error('Error analyzing user intent:', error);
  }

  return { action: 'no_search' };
}

// 执行搜索指令
async function executeSearchInstruction(instruction: SearchInstruction): Promise<string> {
  let relevantContent = '';

  try {
    switch (instruction.action) {
      case 'search_all':
        const { posts: allPosts } = getAllPosts(1, 1000);
        if (allPosts.length > 0) {
          relevantContent += '\n**Complete Article Directory:**\n';
          relevantContent += `Total Articles: ${allPosts.length}\n\n`;

          // 按分类组织文章
          const articlesByCategory: { [key: string]: typeof allPosts } = {};
          allPosts.forEach(post => {
            post.categories.forEach(category => {
              if (!articlesByCategory[category]) {
                articlesByCategory[category] = [];
              }
              if (!articlesByCategory[category].find(p => p.id === post.id)) {
                articlesByCategory[category].push(post);
              }
            });
          });

          // 显示按分类组织的文章
          Object.keys(articlesByCategory).sort().forEach(category => {
            relevantContent += `**${category}:**\n`;
            articlesByCategory[category].forEach(post => {
              relevantContent += `- [${post.title}](/blog/${post.slug}) (${post.date})\n  ${post.excerpt}\n\n`;
            });
          });
        }
        break;

      case 'search_latest':
        const { posts: latestPosts } = getAllPosts(1, instruction.limit || 5);
        if (latestPosts.length > 0) {
          relevantContent += '\n**Latest Blog Posts:**\n';
          latestPosts.forEach(post => {
            relevantContent += `- [${post.title}](/blog/${post.slug}) (${post.date})\n  ${post.excerpt}\n  Categories: ${post.categories.join(', ')}\n\n`;
          });
        }
        break;

      case 'search_topic':
        if (instruction.query) {
          const searchResults = searchPosts(instruction.query);
          if (searchResults.length > 0) {
            relevantContent += `\n**Articles about "${instruction.query}":**\n`;
            searchResults.slice(0, instruction.limit || 5).forEach(post => {
              relevantContent += `- [${post.title}](/blog/${post.slug}) (${post.date})\n  ${post.excerpt}\n  Categories: ${post.categories.join(', ')}\n\n`;
            });
          }
        }
        break;

      case 'search_category':
        if (instruction.query) {
          const categoryPosts = getPostsByCategory(instruction.query);
          if (categoryPosts.length > 0) {
            relevantContent += `\n**Articles in "${instruction.query}" category:**\n`;
            categoryPosts.slice(0, instruction.limit || 10).forEach(post => {
              relevantContent += `- [${post.title}](/blog/${post.slug}) (${post.date})\n  ${post.excerpt}\n\n`;
            });
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error executing search instruction:', error);
  }

  return relevantContent;
}

// 博客内容检索服务（重构版）
async function retrieveBlogContent(userMessage: string) {
  try {
    // 使用AI分析用户意图
    const instruction = await analyzeUserIntent(userMessage);

    // 如果不需要搜索，返回空内容
    if (instruction.action === 'no_search') {
      return '';
    }

    // 执行搜索指令
    const relevantContent = await executeSearchInstruction(instruction);

    // 调试日志
    console.log('Search instruction:', instruction);
    console.log('Retrieved content length:', relevantContent.length);

    return relevantContent;
  } catch (error) {
    console.error('Error in retrieveBlogContent:', error);
    return '';
  }
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

Please respond as Cyrus's AI assistant. Be helpful, friendly, and informative.

IMPORTANT: If you have relevant blog content above, reference specific articles with clickable links using this format: [Article Title](/blog/slug). Always provide links when mentioning articles so users can easily access them.

Keep your response concise but comprehensive.`;

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
      const fallbackResponse = await generateFallbackResponse(message);
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
async function generateFallbackResponse(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // 即使在fallback模式下，也要检测搜索意图并提供真实内容
  try {
    // 使用简单的关键词检测来判断是否有搜索意图
    const hasSearchIntent =
      lowerMessage.includes('blog') || lowerMessage.includes('posts') ||
      lowerMessage.includes('articles') || lowerMessage.includes('recent') ||
      lowerMessage.includes('latest') || lowerMessage.includes('all articles') ||
      lowerMessage.includes('show me') || lowerMessage.includes('list') ||
      lowerMessage.includes('what articles') || lowerMessage.includes('文章') ||
      lowerMessage.includes('所有') || lowerMessage.includes('显示');

    if (hasSearchIntent) {
      // 在fallback模式下直接调用搜索函数
      let searchInstruction: SearchInstruction;

      if (lowerMessage.includes('all') || lowerMessage.includes('complete') ||
          lowerMessage.includes('所有') || lowerMessage.includes('全部')) {
        searchInstruction = { action: 'search_all' };
      } else if (lowerMessage.includes('latest') || lowerMessage.includes('recent') ||
                 lowerMessage.includes('最新') || lowerMessage.includes('最近')) {
        searchInstruction = { action: 'search_latest', limit: 5 };
      } else {
        // 默认显示最新文章
        searchInstruction = { action: 'search_latest', limit: 3 };
      }

      const searchResults = await executeSearchInstruction(searchInstruction);
      if (searchResults) {
        return `Here's what I found on Cyrus's blog:\n\n${searchResults}\n\nLet me know if you'd like to explore any specific topic!`;
      }
    }
  } catch (error) {
    console.error('Error in fallback search:', error);
  }

  // 关于Cyrus的问题
  if (lowerMessage.includes('about cyrus') || lowerMessage.includes('who is cyrus') || lowerMessage.includes('tell me about')) {
    return `Cyrus is a passionate software engineer and technology enthusiast. He specializes in full-stack development, AI/ML, and modern web technologies. He loves sharing his knowledge through this blog, covering topics like web development, programming best practices, and tech industry insights. You can learn more about him in the About section of this blog!`;
  }

  // 技术技能相关
  if (lowerMessage.includes('technical skills') || lowerMessage.includes('technologies') || lowerMessage.includes('programming') || lowerMessage.includes('skills') || lowerMessage.includes('tech')) {
    return `Cyrus has expertise in various technologies including React, Next.js, TypeScript, Python, and cloud platforms. He's particularly passionate about modern web development, AI/ML applications, and creating great user experiences. You can find detailed technical articles and tutorials throughout his blog posts!`;
  }

  // 博客相关的搜索意图已在上面处理

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
