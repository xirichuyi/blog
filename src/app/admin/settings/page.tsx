"use client";

import { useState, useEffect } from 'react';

export default function AdminSettings() {
  const [token, setToken] = useState('');
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // 加载保存的设置
  useEffect(() => {
    const savedToken = localStorage.getItem('blogAdminToken') || '';
    const savedDeepseekApiKey = localStorage.getItem('deepseekApiKey') || '';
    const savedDeepseekModel = localStorage.getItem('deepseekModel') || 'deepseek-chat';

    setToken(savedToken);
    setDeepseekApiKey(savedDeepseekApiKey);
    setDeepseekModel(savedDeepseekModel);
  }, []);

  // 保存设置
  const handleSaveSettings = () => {
    setIsSaving(true);
    setSuccess(null);

    try {
      localStorage.setItem('blogAdminToken', token);
      localStorage.setItem('deepseekApiKey', deepseekApiKey);
      localStorage.setItem('deepseekModel', deepseekModel);
      setSuccess('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="card-apple p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">API Authentication</h2>

        {success && (
          <div className="bg-green-900/30 text-green-300 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-apple-gray-300 mb-1">
            Admin API Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
            placeholder="Enter your admin API token"
          />
          <p className="text-xs text-apple-gray-400 mt-1">
            This token is used to authenticate API requests. You can find it in your .env.local file.
          </p>
        </div>

        <div className="border-t border-apple-gray-700 my-6 pt-6">
          <h3 className="text-md font-semibold mb-4">Deepseek AI Settings</h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Deepseek API Key
            </label>
            <input
              type="password"
              value={deepseekApiKey}
              onChange={(e) => setDeepseekApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              placeholder="Enter your Deepseek API key"
            />
            <p className="text-xs text-apple-gray-400 mt-1">
              Your Deepseek API key is required to generate content using Deepseek models.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Deepseek Model
            </label>
            <select
              value={deepseekModel}
              onChange={(e) => setDeepseekModel(e.target.value)}
              className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
            >
              <option value="deepseek-chat">Deepseek Chat</option>
              <option value="deepseek-coder">Deepseek Coder</option>
              <option value="deepseek-lite">Deepseek Lite</option>
            </select>
            <p className="text-xs text-apple-gray-400 mt-1">
              Select the Deepseek model you want to use for content generation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          className="btn-apple btn-apple-primary"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="card-apple p-6 max-w-2xl mt-6">
        <h2 className="text-lg font-semibold mb-4">Help & Documentation</h2>

        <div className="space-y-4 text-apple-gray-300">
          <p>
            This admin panel allows you to manage your blog content, including creating, editing, and deleting posts.
          </p>

          <div>
            <h3 className="font-medium mb-1">API Token</h3>
            <p className="text-sm">
              The API token is required for authentication. It should be set in your .env.local file as BLOG_ADMIN_TOKEN.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">Markdown Support</h3>
            <p className="text-sm">
              Blog posts support Markdown formatting. You can use headings, lists, links, and other Markdown syntax in your content.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">AI Assistant</h3>
            <p className="text-sm">
              The AI Assistant can help you generate content for your blog posts. Simply provide a prompt and the AI will generate content based on it.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-1">Deepseek API</h3>
            <p className="text-sm">
              To use Deepseek AI for content generation, you need to provide your Deepseek API key. You can get an API key by signing up at <a href="https://platform.deepseek.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">platform.deepseek.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
