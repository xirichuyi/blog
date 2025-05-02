import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/blog-admin';

// 这个函数模拟与AI服务的交互
// 在实际应用中，你需要集成OpenAI或其他AI服务的API
async function generateContent(prompt: string, type: string): Promise<string> {
  // 这里应该是调用AI API的代码
  // 例如使用OpenAI API:
  // const response = await openai.createCompletion({
  //   model: "gpt-3.5-turbo",
  //   prompt: prompt,
  //   max_tokens: 1000
  // });
  // return response.choices[0].text;
  
  // 模拟响应
  return `这是由AI生成的${type}内容，基于提示: "${prompt}"。
  
在实际实现中，这将是由OpenAI或其他AI服务生成的高质量内容。

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
    const { prompt, type = 'article' } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const content = await generateContent(prompt, type);
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
