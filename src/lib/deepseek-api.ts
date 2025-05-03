/**
 * Deepseek API工具函数
 * 用于调用Deepseek API生成内容
 */

// Deepseek API端点
const DEEPSEEK_API_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

// Deepseek模型映射
export const DEEPSEEK_MODELS = {
  'deepseek-chat': 'deepseek-chat',
  'deepseek-coder': 'deepseek-coder',
  'deepseek-lite': 'deepseek-lite',
};

// 请求选项接口
interface DeepseekRequestOptions {
  apiKey: string;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 调用Deepseek API生成内容
 * @param options 请求选项
 * @returns 生成的内容
 */
export async function generateWithDeepseek(options: DeepseekRequestOptions): Promise<string> {
  const { apiKey, model, prompt, temperature = 0.7, maxTokens = 1000 } = options;
  
  if (!apiKey) {
    throw new Error('Deepseek API key is required');
  }
  
  try {
    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODELS[model as keyof typeof DEEPSEEK_MODELS] || 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate content with Deepseek API');
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling Deepseek API:', error);
    throw error;
  }
}

/**
 * 验证Deepseek API密钥
 * @param apiKey Deepseek API密钥
 * @returns 是否有效
 */
export async function validateDeepseekApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  
  try {
    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        max_tokens: 5,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error validating Deepseek API key:', error);
    return false;
  }
}
