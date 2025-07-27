import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Editor, { loader } from '@monaco-editor/react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { adminApi } from '../../services/api';
import type { BlogPost } from '../../types/blog';
import ImageUploader from './ImageUploader';
import { getErrorMessage, isAuthError } from '../../utils/errorHandler';

// 配置Monaco编辑器使用本地资源
loader.config({
  paths: {
    vs: '/node_modules/monaco-editor/min/vs'
  }
});

interface PostEditorProps {
  mode: 'new' | 'edit';
}

export default function PostEditor({ mode }: PostEditorProps) {
  const navigate = useNavigate();
  const { slug } = useParams();
  
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: '',
    excerpt: '',
    content: '',
    categories: [],
    slug: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // 加载现有文章（编辑模式）
  useEffect(() => {
    if (mode === 'edit' && slug) {
      loadPost(slug);
    }
  }, [mode, slug]);

  const loadPost = async (postSlug: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const postData = await adminApi.getPost(postSlug);
      setPost(postData);
    } catch (error) {
      console.error('Error loading post:', error);
      const errorMessage = getErrorMessage(error, 'Failed to load post');
      setError(errorMessage);

      // 如果是认证错误，可能需要重新登录
      if (isAuthError(error)) {
        // 可以在这里添加重定向到登录页面的逻辑
        console.warn('Authentication error detected');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 生成slug
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // 处理标题变化
  const handleTitleChange = (title: string) => {
    setPost(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  // 添加分类
  const addCategory = () => {
    if (newCategory.trim() && !post.categories?.includes(newCategory.trim())) {
      setPost(prev => ({
        ...prev,
        categories: [...(prev.categories || []), newCategory.trim()]
      }));
      setNewCategory('');
    }
  };

  // 处理图片上传
  const handleImageUploaded = (imageUrl: string) => {
    const imageMarkdown = `![Image](${imageUrl})`;
    setPost(prev => ({
      ...prev,
      content: prev.content + '\n\n' + imageMarkdown
    }));
  };

  // 移除分类
  const removeCategory = (category: string) => {
    setPost(prev => ({
      ...prev,
      categories: prev.categories?.filter(c => c !== category) || []
    }));
  };

  // 保存文章
  const handleSave = async () => {
    if (!post.title?.trim() || !post.content?.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 将日期转换为完整的ISO 8601格式并确保所有必需字段
      const postToSave = {
        title: post.title || '',
        excerpt: post.excerpt || '',
        content: post.content || '',
        slug: post.slug || '',
        date: post.date ? `${post.date}T00:00:00Z` : new Date().toISOString(),
        categories: post.categories || []
      };

      if (mode === 'new') {
        await adminApi.createPost(postToSave);
      } else {
        await adminApi.updatePost(slug!, postToSave);
      }

      navigate('/admin/posts');
    } catch (error) {
      console.error('Error saving post:', error);
      const errorMessage = getErrorMessage(error, 'Failed to save post');
      setError(errorMessage);

      // 如果是认证错误，可能需要重新登录
      if (isAuthError(error)) {
        console.warn('Authentication error detected');
        // 可以在这里添加重定向到登录页面的逻辑
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-400">Loading post...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {mode === 'new' ? 'Create New Post' : 'Edit Post'}
          </h1>
          <p className="text-gray-400 mt-1">
            {mode === 'new' ? 'Write a new blog post' : 'Edit your blog post'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/posts')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !post.title?.trim() || !post.content?.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300"
        >
          <div className="flex items-start">
            <svg
              className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-red-200 mb-1">操作失败</h4>
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
              >
                关闭
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Post Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={post.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter post title..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {post.slug && (
              <p className="text-sm text-gray-400 mt-2">
                Slug: <span className="text-primary">{post.slug}</span>
              </p>
            )}
          </div>

          {/* Excerpt */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <label className="block text-sm font-medium mb-2">Excerpt</label>
            <textarea
              value={post.excerpt || ''}
              onChange={(e) => setPost(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Brief description of the post..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
            />
          </div>

          {/* Content Editor */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium">Content</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode(false)}
                  className={`px-3 py-1 text-sm rounded ${
                    !previewMode ? 'bg-primary text-white' : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setPreviewMode(true)}
                  className={`px-3 py-1 text-sm rounded ${
                    previewMode ? 'bg-primary text-white' : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {previewMode ? (
              <div className="h-96 overflow-y-auto bg-gray-700 rounded-lg p-4">
                <MarkdownPreview
                  source={post.content || ''}
                  style={{ backgroundColor: 'transparent', color: 'white' }}
                />
              </div>
            ) : (
              <Editor
                height="400px"
                defaultLanguage="markdown"
                value={post.content || ''}
                onChange={(value) => setPost(prev => ({ ...prev, content: value || '' }))}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Categories */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <label className="block text-sm font-medium mb-3">Categories</label>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Add category..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              />
              <button
                onClick={addCategory}
                className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {post.categories?.map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                >
                  {category}
                  <button
                    onClick={() => removeCategory(category)}
                    className="ml-1 text-primary/70 hover:text-primary"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Image Uploader */}
          <ImageUploader onImageUploaded={handleImageUploaded} />

          {/* Publish Date */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <label className="block text-sm font-medium mb-2">Publish Date</label>
            <input
              type="date"
              value={post.date || ''}
              onChange={(e) => setPost(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
