import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../services/api';

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
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('full-article');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('general readers');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [useDeepseek, setUseDeepseek] = useState(true);
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat');

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

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Assistant</h1>
          <p className="text-gray-400">Generate content using AI to help with your blog posts</p>
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
