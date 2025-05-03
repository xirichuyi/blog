"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { promptTemplates, fillPromptTemplate } from '@/lib/ai-templates';

function AIAssistantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('full-article');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('general readers');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [useDeepseek, setUseDeepseek] = useState(true);
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat');
  const [apiKeyStatus, setApiKeyStatus] = useState<'unchecked' | 'valid' | 'invalid'>('unchecked');

  // 加载Deepseek设置
  useEffect(() => {
    const savedDeepseekApiKey = localStorage.getItem('deepseekApiKey') || '';
    const savedDeepseekModel = localStorage.getItem('deepseekModel') || 'deepseek-chat';

    setDeepseekApiKey(savedDeepseekApiKey);
    setDeepseekModel(savedDeepseekModel);
    setUseDeepseek(!!savedDeepseekApiKey);

    // 如果有API密钥，设置状态为未检查
    if (savedDeepseekApiKey) {
      setApiKeyStatus('unchecked');
    }
  }, []);

  // 从URL参数中获取数据
  useEffect(() => {
    const titleParam = searchParams.get('title');
    const excerptParam = searchParams.get('excerpt');
    const contentParam = searchParams.get('content');
    const templateParam = searchParams.get('selectedTemplate');

    if (titleParam) setTitle(titleParam);
    if (excerptParam) setExcerpt(excerptParam);
    if (contentParam) setContent(contentParam);
    if (templateParam) setSelectedTemplate(templateParam);

    // 自动生成提示
    if (titleParam) {
      const templateObj = promptTemplates.find(t => t.id === (templateParam || selectedTemplate));
      const template = templateObj?.template || '';
      const filledPrompt = fillPromptTemplate(
        template,
        {
          title: titleParam,
          excerpt: excerptParam || '',
          content: contentParam || '',
          tone,
          audience
        },
        useDeepseek,
        templateObj
      );
      setPrompt(filledPrompt);
    }
  }, [searchParams, selectedTemplate, tone, audience, useDeepseek]);

  // 当模板或变量改变时更新提示
  useEffect(() => {
    if (title) {
      const templateObj = promptTemplates.find(t => t.id === selectedTemplate);
      const template = templateObj?.template || '';
      const filledPrompt = fillPromptTemplate(
        template,
        {
          title,
          excerpt,
          content,
          tone,
          audience
        },
        useDeepseek,
        templateObj
      );
      setPrompt(filledPrompt);
    }
  }, [selectedTemplate, title, excerpt, content, tone, audience, useDeepseek]);

  // 生成内容
  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a prompt');
      return;
    }

    // 如果启用了Deepseek但没有API密钥
    if (useDeepseek && !deepseekApiKey) {
      setError('Deepseek API key is required. Please add it in the Settings page.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
        },
        body: JSON.stringify({
          prompt,
          type: selectedTemplate,
          deepseekApiKey: useDeepseek ? deepseekApiKey : undefined,
          deepseekModel: useDeepseek ? deepseekModel : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.content);

        // 如果使用了Deepseek API且成功生成内容，将API密钥状态设置为有效
        if (useDeepseek && deepseekApiKey) {
          setApiKeyStatus('valid');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'An error occurred');

        // 如果使用了Deepseek API但生成内容失败，可能是API密钥无效
        if (useDeepseek && deepseekApiKey && errorData.error?.includes('API key')) {
          setApiKeyStatus('invalid');
        }
      }
    } catch (error) {
      setError('An error occurred while generating content');
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 创建新文章
  const handleCreatePost = () => {
    if (!title || !generatedContent) return;

    // 创建新文章的日期
    const today = new Date().toISOString().split('T')[0];

    // 生成slug
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    // 提取摘要（第一段）
    const excerpt = generatedContent.split('\n\n')[0].replace(/^这是由AI生成的.*内容，基于提示:.*。\s*/, '').trim();

    // 重定向到新文章页面，并传递生成的内容
    router.push(`/admin/posts/new?title=${encodeURIComponent(title)}&content=${encodeURIComponent(generatedContent)}&excerpt=${encodeURIComponent(excerpt)}&slug=${encodeURIComponent(slug)}&date=${today}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI Assistant</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-4">Generate Content</h2>

          {error && (
            <div className="bg-red-900/30 text-red-300 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Post Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              placeholder="Enter a title for your post"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-apple-gray-300 mb-1">
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              >
                {promptTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-apple-gray-400 mt-1">
                {promptTemplates.find(t => t.id === selectedTemplate)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-apple-gray-300 mb-1">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
                <option value="educational">Educational</option>
                <option value="enthusiastic">Enthusiastic</option>
              </select>
            </div>
          </div>

          <div className="mb-4 border-t border-apple-gray-700 pt-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-apple-gray-300">
                Deepseek AI Settings
              </label>

              <div className="flex items-center">
                <span className="text-xs mr-2 text-apple-gray-400">Use Deepseek AI</span>
                <button
                  type="button"
                  onClick={() => setUseDeepseek(!useDeepseek)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    useDeepseek ? 'bg-primary' : 'bg-apple-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useDeepseek ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {useDeepseek && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center">
                    <label className="block text-sm font-medium text-apple-gray-300 mb-1 flex-1">
                      API Key Status
                    </label>
                    <span className={`text-xs px-2 py-1 rounded ${
                      apiKeyStatus === 'valid'
                        ? 'bg-green-900/30 text-green-300'
                        : apiKeyStatus === 'invalid'
                          ? 'bg-red-900/30 text-red-300'
                          : 'bg-yellow-900/30 text-yellow-300'
                    }`}>
                      {apiKeyStatus === 'valid'
                        ? 'Valid'
                        : apiKeyStatus === 'invalid'
                          ? 'Invalid'
                          : 'Not Checked'}
                    </span>
                  </div>
                  <p className="text-xs text-apple-gray-400 mt-1">
                    {deepseekApiKey
                      ? 'API key is set. You can update it in Settings.'
                      : 'No API key set. Please add it in Settings.'}
                    {' '}
                    <Link href="/admin/settings" className="text-primary hover:underline">
                      Go to Settings
                    </Link>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-apple-gray-300 mb-1">
                    Deepseek Model
                  </label>
                  <select
                    value={deepseekModel}
                    onChange={(e) => setDeepseekModel(e.target.value)}
                    className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
                    disabled={!deepseekApiKey}
                  >
                    <option value="deepseek-chat">Deepseek Chat</option>
                    <option value="deepseek-coder">Deepseek Coder</option>
                    <option value="deepseek-lite">Deepseek Lite</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Target Audience
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              placeholder="e.g., beginners, professionals, students"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white font-mono"
              placeholder="Describe what you want the AI to write about..."
            />
            <p className="text-xs text-apple-gray-400 mt-1">
              This prompt is automatically generated based on your template and variables. You can edit it directly for more control.
              {useDeepseek && <span className="ml-1 text-primary">Using Deepseek-optimized prompt format.</span>}
            </p>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => {
                if (selectedTemplate === 'rewrite' && !content) {
                  setError('Please provide content to rewrite');
                  return;
                }
                handleGenerate();
              }}
              className="btn-apple btn-apple-primary"
              disabled={isGenerating || !prompt || !title || (useDeepseek && !deepseekApiKey)}
            >
              {isGenerating
                ? 'Generating...'
                : useDeepseek
                  ? `Generate with Deepseek ${deepseekModel.replace('deepseek-', '')}`
                  : 'Generate Content'
              }
            </button>
          </div>
        </div>

        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-4">Generated Content</h2>

          <div className="min-h-[300px] border border-apple-gray-700 rounded-lg p-4 bg-apple-gray-800 mb-4 overflow-y-auto">
            {generatedContent ? (
              <div className="prose prose-sm prose-invert">
                {generatedContent.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-apple-gray-400 italic">
                Generated content will appear here...
                {useDeepseek && !deepseekApiKey && (
                  <span className="block mt-2 text-yellow-300">
                    Deepseek API key is required. Please add it in the Settings page.
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generatedContent);
              }}
              className="btn-apple btn-apple-secondary"
              disabled={!generatedContent}
            >
              Copy to Clipboard
            </button>

            <button
              type="button"
              onClick={handleCreatePost}
              className="btn-apple btn-apple-primary"
              disabled={!generatedContent || !title}
            >
              Create Post with This Content
            </button>
          </div>

          {useDeepseek && generatedContent && (
            <div className="mt-4 text-xs text-apple-gray-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Content generated using Deepseek AI
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 card-apple p-6">
        <h2 className="text-lg font-semibold mb-4">AI Writing Tips</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2 text-white">Effective Prompts</h3>
            <ul className="text-sm space-y-2 text-apple-gray-300">
              <li>• Be specific about your topic and desired outcome</li>
              <li>• Specify the tone (professional, casual, technical)</li>
              <li>• Mention your target audience</li>
              <li>• Include any key points you want covered</li>
              <li>• Specify the desired length or depth</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-white">Example Prompts</h3>
            <div className="text-sm space-y-3 text-apple-gray-300">
              <p className="italic">
                &quot;Write a comprehensive guide about machine learning for beginners. Include sections on supervised vs. unsupervised learning, common algorithms, and practical applications.&quot;
              </p>
              <p className="italic">
                &quot;Create an engaging introduction for a blog post about sustainable living practices that can save money. Target audience is young professionals.&quot;
              </p>
            </div>
          </div>
        </div>

        {useDeepseek && (
          <div className="mt-6 pt-6 border-t border-apple-gray-700">
            <h3 className="font-medium mb-2 text-white">Deepseek AI Tips</h3>
            <ul className="text-sm space-y-2 text-apple-gray-300">
              <li>• Deepseek models perform best with clear, detailed instructions</li>
              <li>• The templates are optimized for Deepseek&apos;s response format</li>
              <li>• For technical content, try the &quot;Technical Article&quot; template</li>
              <li>• For step-by-step guides, use the &quot;Tutorial&quot; template</li>
              <li>• You can save your API key in the Settings page for future use</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAssistantClient() {
  return (
    <Suspense fallback={<div>Loading AI Assistant...</div>}>
      <AIAssistantContent />
    </Suspense>
  );
}
