import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import type { BlogPost } from '../../types/blog';
import { adminApi, blogApi } from '../../services/api';
import ImageUploader from './ImageUploader';

interface SimplePostEditorProps {
  mode: 'new' | 'edit';
}

export default function SimplePostEditor({ mode }: SimplePostEditorProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: '',
    content: '',
    categories: [],
    slug: '',
    featuredImage: ''
  });

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 生成slug
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // 自动生成摘要
  const generateExcerpt = (content: string, maxLength: number = 150): string => {
    if (!content) return '';
    
    const plainText = content
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    const truncated = plainText.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  };

  // 处理标题变化
  const handleTitleChange = (title: string) => {
    setPost(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  // 处理内容变化
  const handleContentChange = (content: string) => {
    const autoExcerpt = generateExcerpt(content);
    setPost(prev => ({
      ...prev,
      content,
      excerpt: autoExcerpt
    }));
  };

  // 选择分类
  const handleCategorySelect = (category: string) => {
    setPost(prev => ({
      ...prev,
      categories: category ? [category] : [] // 如果选择了分类则设置，否则清空
    }));
    setSelectedCategory(category);
  };

  // 处理图片上传
  const handleImageUploaded = (url: string) => {
    setPost(prev => ({ ...prev, featuredImage: url }));
  };

  // 保存文章
  const handleSave = useCallback(async () => {
    if (!post.title?.trim() || !post.content?.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const autoExcerpt = generateExcerpt(post.content || '');
      
      const postToSave = {
        title: post.title || '',
        excerpt: autoExcerpt,
        content: post.content || '',
        slug: post.slug || '',
        categories: post.categories || [],
        featuredImage: post.featuredImage || '',
        date: now,
        ...(mode === 'new' ? {
          createdAt: now,
          updatedAt: now
        } : {
          updatedAt: now
        })
      };

      if (mode === 'new') {
        await adminApi.createPost(postToSave);
      } else {
        await adminApi.updatePost(slug!, postToSave);
      }

      navigate('/admin/posts');
    } catch (error) {
      console.error('Error saving post:', error);
      setError('Failed to save post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [post, mode, slug, navigate]);

  // 快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // 加载分类列表
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await blogApi.getCategories();
        setAvailableCategories(categories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  // 加载文章（编辑模式）
  useEffect(() => {
    if (mode === 'edit' && slug) {
      setIsLoading(true);
      adminApi.getPost(slug)
        .then(postData => {
          setPost(postData);
          // 设置当前选中的分类（如果有的话）
          if (postData.categories && postData.categories.length > 0) {
            setSelectedCategory(postData.categories[0]);
          }
        })
        .catch(error => {
          console.error('Error loading post:', error);
          setError('Failed to load post');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [mode, slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg"
        >
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        </motion.div>
      )}

      {/* Header Row: Title, Tags, Uploader */}
      <div className="admin-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Title */}
          <div className="lg:col-span-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={post.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter your post title..."
              className="admin-input w-full"
              disabled={isLoading}
            />
            {post.slug && (
              <p className="text-xs text-gray-400 mt-1">
                URL: <span className="text-primary">/{post.slug}</span>
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <div className="flex items-center gap-2">
              {post.categories && post.categories.length > 0 && (
                <span className="admin-badge admin-badge-info">
                  {post.categories[0]}
                </span>
              )}
              <select
                value={selectedCategory}
                onChange={(e) => handleCategorySelect(e.target.value)}
                className="admin-input flex-1 text-sm"
                disabled={isLoading}
              >
                <option value="">Select a category...</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Image Uploader */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Featured Image
            </label>
            <ImageUploader
              onImageUploaded={handleImageUploaded}
              currentImage={post.featuredImage}
            />
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="admin-card">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-300">
              Content *
            </label>
            <div className="flex items-center text-xs text-gray-400">
              <span>Words: {post.content ? post.content.split(/\s+/).filter(word => word.length > 0).length : 0}</span>
              <span className="mx-2">•</span>
              <span>Characters: {post.content ? post.content.length : 0}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode(false)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  !previewMode ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setPreviewMode(true)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  previewMode ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Preview
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading || !post.title?.trim() || !post.content?.trim()}
              className="admin-btn admin-btn-primary text-sm"
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full mr-1"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {mode === 'new' ? 'Publish' : 'Update'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="relative">
          {!previewMode ? (
            <Editor
              height="500px"
              defaultLanguage="markdown"
              value={post.content || ''}
              onChange={(value) => handleContentChange(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                padding: { top: 20, bottom: 20 },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                renderLineHighlight: 'gutter',
              }}
            />
          ) : (
            <div className="p-6 prose prose-invert max-w-none">
              <ReactMarkdown>{post.content || ''}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>
                <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Ctrl+S</kbd> to save
              </span>
              <span>Markdown supported</span>
              {post.excerpt && (
                <span>Auto-excerpt: {post.excerpt.length} chars</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/admin/posts')}
                className="admin-btn admin-btn-secondary text-xs px-3 py-1"
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
