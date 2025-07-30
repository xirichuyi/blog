import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '@/services/api';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isGenerating?: boolean;
}

const promptTemplates = {
  'full-article': {
    name: 'Full Article',
    description: 'Generate a complete blog article',
    template: 'Write a comprehensive blog article about: {topic}\n\nTone: {tone}\nAudience: {audience}\n\nInclude:\n- Engaging introduction\n- Well-structured main content\n- Practical examples\n- Conclusion with key takeaways'
  },
  'technical-article': {
    name: 'Technical Article',
    description: 'Generate a technical deep-dive article',
    template: 'Write a technical article about: {topic}\n\nTone: {tone}\nAudience: {audience}\n\nInclude:\n- Technical overview\n- Implementation details\n- Code examples\n- Best practices\n- Common pitfalls'
  },
  'tutorial': {
    name: 'Tutorial',
    description: 'Generate a step-by-step tutorial',
    template: 'Create a step-by-step tutorial for: {topic}\n\nTone: {tone}\nAudience: {audience}\n\nInclude:\n- Prerequisites\n- Step-by-step instructions\n- Screenshots/examples\n- Troubleshooting tips'
  },
  'summary': {
    name: 'Summary',
    description: 'Generate a summary or overview',
    template: 'Create a comprehensive summary of: {topic}\n\nTone: {tone}\nAudience: {audience}\n\nInclude:\n- Key points\n- Main concepts\n- Important details\n- Conclusion'
  }
};

export default function AdminAIAssistant() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('full-article');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('general readers');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useDeepseek, setUseDeepseek] = useState(true);
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat');
  const [viewMode, setViewMode] = useState<'chat' | 'template'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 加载保存的设置
  useEffect(() => {
    const savedApiKey = localStorage.getItem('deepseekApiKey') || '';
    const savedModel = localStorage.getItem('deepseekModel') || 'deepseek-chat';
    
    setDeepseekApiKey(savedApiKey);
    setDeepseekModel(savedModel);
    setUseDeepseek(!!savedApiKey);
  }, []);

  // 保存设置
  const saveSettings = () => {
    if (useDeepseek) {
      localStorage.setItem('deepseekApiKey', deepseekApiKey);
      localStorage.setItem('deepseekModel', deepseekModel);
    } else {
      localStorage.removeItem('deepseekApiKey');
      localStorage.removeItem('deepseekModel');
    }
  };

  // 填充模板
  const fillTemplate = (template: string) => {
    return template
      .replace('{topic}', prompt)
      .replace('{tone}', tone)
      .replace('{audience}', audience);
  };

  // 生成内容
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a topic or prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');

    try {
      const templateData = promptTemplates[selectedTemplate as keyof typeof promptTemplates];
      const fullPrompt = fillTemplate(templateData.template);

      const content = await adminApi.generateContent(
        fullPrompt,
        selectedTemplate,
        useDeepseek ? deepseekApiKey : undefined,
        useDeepseek ? deepseekModel : undefined
      );

      setGeneratedContent(content);
    } catch (error) {
      console.error('Error generating content:', error);
      setError('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 发送聊天消息
  const sendChatMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: currentInput,
      isUser: true,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsGenerating(true);
    setError(null);

    // 添加AI正在生成的消息
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: '',
      isUser: false,
      timestamp: new Date(),
      isGenerating: true
    };

    setChatMessages(prev => [...prev, aiMessage]);

    try {
      const content = await adminApi.generateContent(
        currentInput,
        'chat',
        useDeepseek ? deepseekApiKey : undefined,
        useDeepseek ? deepseekModel : undefined
      );

      // 更新AI消息
      setChatMessages(prev => prev.map(msg =>
        msg.id === aiMessage.id
          ? { ...msg, content, isGenerating: false }
          : msg
      ));
    } catch (error) {
      console.error('Error generating content:', error);
      setError('Failed to generate content. Please try again.');

      // 移除失败的AI消息
      setChatMessages(prev => prev.filter(msg => msg.id !== aiMessage.id));
    } finally {
      setIsGenerating(false);
    }
  };

  // 清空聊天记录
  const clearChat = () => {
    setChatMessages([]);
    setError(null);
  };

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 处理回车键发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (viewMode === 'chat') {
        sendChatMessage();
      } else {
        handleGenerate();
      }
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Header */}
        <div className="admin-card p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">AI Assistant</h1>
              <p className="text-gray-400">
                Generate content using AI to help with your blog posts
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chat')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'chat'
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat Mode
              </button>
              <button
                onClick={() => setViewMode('template')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'template'
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Template Mode
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">Content Generation</h2>
              
              {/* Template Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(promptTemplates).map(([key, template]) => (
                    <option key={key} value={key}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-400 mt-1">
                  {promptTemplates[selectedTemplate as keyof typeof promptTemplates].description}
                </p>
              </div>

              {/* Topic Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Topic/Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter the topic or prompt for content generation..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
                />
              </div>

              {/* Tone and Audience */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="technical">Technical</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="general readers">General Readers</option>
                    <option value="developers">Developers</option>
                    <option value="beginners">Beginners</option>
                    <option value="experts">Experts</option>
                    <option value="business professionals">Business Professionals</option>
                  </select>
                </div>
              </div>

              {/* Deepseek Settings */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="useDeepseek"
                    checked={useDeepseek}
                    onChange={(e) => setUseDeepseek(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="useDeepseek" className="text-sm font-medium">
                    Use Deepseek AI
                  </label>
                </div>
                
                {useDeepseek && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">API Key</label>
                      <input
                        type="password"
                        value={deepseekApiKey}
                        onChange={(e) => setDeepseekApiKey(e.target.value)}
                        placeholder="Enter your Deepseek API key"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Model</label>
                      <select
                        value={deepseekModel}
                        onChange={(e) => setDeepseekModel(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="deepseek-chat">deepseek-chat</option>
                        <option value="deepseek-coder">deepseek-coder</option>
                      </select>
                    </div>
                    <button
                      onClick={saveSettings}
                      className="text-sm bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded transition-colors"
                    >
                      Save Settings
                    </button>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? 'Generating...' : 'Generate Content'}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Output Panel */}
          <div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">Generated Content</h2>
              
              {isGenerating ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-gray-400">Generating content...</span>
                </div>
              ) : generatedContent ? (
                <div className="space-y-4">
                  <textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    className="w-full h-96 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedContent)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={() => setGeneratedContent('')}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  Generated content will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
