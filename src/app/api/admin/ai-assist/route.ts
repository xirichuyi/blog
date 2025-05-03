import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/blog-admin-server';
import { generateWithDeepseek } from '@/lib/deepseek-api';

// 生成内容的函数
async function generateContent(prompt: string, type: string, apiKey?: string, model?: string): Promise<string> {
  // 如果提供了Deepseek API密钥，使用Deepseek API
  if (apiKey) {
    try {
      const content = await generateWithDeepseek({
        apiKey,
        model: model || 'deepseek-chat',
        prompt,
        temperature: 0.7,
        maxTokens: 2000
      });

      return content;
    } catch (error) {
      console.error('Error generating content with Deepseek API:', error);
      // 如果Deepseek API调用失败，回退到模拟响应
      return generateMockContent(prompt, type);
    }
  }

  // 如果没有提供API密钥，使用模拟响应
  return generateMockContent(prompt, type);
}

// 生成模拟内容的函数
function generateMockContent(prompt: string, type: string): string {
  return `这是由AI生成的${type}内容，基于提示: "${prompt}"。

在实际实现中，这将是由Deepseek或其他AI服务生成的高质量内容。请在设置页面配置您的Deepseek API密钥以启用真实的AI内容生成。

## 示例标题

这是一个示例段落，展示AI生成的内容格式。您可以根据需要调整提示和参数，以获得更符合您需求的内容。

## 另一个标题

- 这是一个要点
- 这是另一个要点
- AI可以生成结构化内容

希望这个示例对您有所帮助！`;
}

export async function POST(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt, type = 'article', deepseekApiKey, deepseekModel } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // 使用Deepseek API生成内容（如果提供了API密钥）
    const content = await generateContent(prompt, type, deepseekApiKey, deepseekModel);

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
