"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { promptTemplates, fillPromptTemplate } from '@/lib/ai-templates';

export default function AIAssistant() {
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

  // 从URL参数中获取数据
  useEffect(() => {
    const titleParam = searchParams.get('title');
    const excerptParam = searchParams.get('excerpt');
    const contentParam = searchParams.get('content');

    if (titleParam) setTitle(titleParam);
    if (excerptParam) setExcerpt(excerptParam);
    if (contentParam) setContent(contentParam);

    // 自动生成提示
    if (titleParam) {
      const template = promptTemplates.find(t => t.id === selectedTemplate)?.template || '';
      const filledPrompt = fillPromptTemplate(template, {
        title: titleParam,
        excerpt: excerptParam || '',
        content: contentParam || '',
        tone,
        audience
      });
      setPrompt(filledPrompt);
    }
  }, [searchParams]);

  // 当模板或变量改变时更新提示
  useEffect(() => {
    if (title) {
      const template = promptTemplates.find(t => t.id === selectedTemplate)?.template || '';
      const filledPrompt = fillPromptTemplate(template, {
        title,
        excerpt,
        content,
        tone,
        audience
      });
      setPrompt(filledPrompt);
    }
  }, [selectedTemplate, title, excerpt, content, tone, audience]);

  // 生成内容
  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a prompt');
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
        body: JSON.stringify({ prompt, type: selectedTemplate })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.content);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'An error occurred');
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
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-apple-gray-700 dark:text-apple-gray-300 mb-1">
              Post Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-apple-gray-300 dark:border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-apple-gray-800"
              placeholder="Enter a title for your post"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-apple-gray-700 dark:text-apple-gray-300 mb-1">
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-2 border border-apple-gray-300 dark:border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-apple-gray-800"
              >
                {promptTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 mt-1">
                {promptTemplates.find(t => t.id === selectedTemplate)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-apple-gray-700 dark:text-apple-gray-300 mb-1">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border border-apple-gray-300 dark:border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-apple-gray-800"
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
                <option value="educational">Educational</option>
                <option value="enthusiastic">Enthusiastic</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-apple-gray-700 dark:text-apple-gray-300 mb-1">
              Target Audience
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-4 py-2 border border-apple-gray-300 dark:border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-apple-gray-800"
              placeholder="e.g., beginners, professionals, students"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-apple-gray-700 dark:text-apple-gray-300 mb-1">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-apple-gray-300 dark:border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-apple-gray-800"
              placeholder="Describe what you want the AI to write about..."
            />
            <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 mt-1">
              This prompt is automatically generated based on your template and variables. You can edit it directly for more control.
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
              disabled={isGenerating || !prompt || !title}
            >
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </button>
          </div>
        </div>

        <div className="card-apple p-6">
          <h2 className="text-lg font-semibold mb-4">Generated Content</h2>

          <div className="min-h-[300px] border border-apple-gray-300 dark:border-apple-gray-700 rounded-lg p-4 bg-white dark:bg-apple-gray-800 mb-4 overflow-y-auto">
            {generatedContent ? (
              <div className="prose prose-sm dark:prose-invert">
                {generatedContent.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-apple-gray-500 dark:text-apple-gray-400 italic">
                Generated content will appear here...
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
        </div>
      </div>

      <div className="mt-8 card-apple p-6">
        <h2 className="text-lg font-semibold mb-4">AI Writing Tips</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Effective Prompts</h3>
            <ul className="text-sm space-y-2 text-apple-gray-700 dark:text-apple-gray-300">
              <li>• Be specific about your topic and desired outcome</li>
              <li>• Specify the tone (professional, casual, technical)</li>
              <li>• Mention your target audience</li>
              <li>• Include any key points you want covered</li>
              <li>• Specify the desired length or depth</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Example Prompts</h3>
            <div className="text-sm space-y-3 text-apple-gray-700 dark:text-apple-gray-300">
              <p className="italic">
                "Write a comprehensive guide about machine learning for beginners. Include sections on supervised vs. unsupervised learning, common algorithms, and practical applications."
              </p>
              <p className="italic">
                "Create an engaging introduction for a blog post about sustainable living practices that can save money. Target audience is young professionals."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
