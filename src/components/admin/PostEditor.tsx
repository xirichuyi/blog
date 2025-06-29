"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ImageUploader from './ImageUploader';

// 导入MDEditor的CSS样式
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

// 动态导入MDEditor以避免SSR问题
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-apple-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-apple-gray-400">加载编辑器中...</span>
    </div>
  }
);

interface Post {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  categories: string[];
  content?: string;
  timestamp?: string; // 添加可选的timestamp属性
}

interface PostEditorProps {
  post: Post;
  mode: 'new' | 'edit';
}

function PostEditorContent({ post, mode }: PostEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<Post & { content: string }>({
    ...post,
    // 在编辑模式下，不使用post.content，因为它可能是HTML而不是Markdown
    content: mode === 'edit' ? '' : (post.content || '')
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(mode === 'edit' && !post.content);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [editorPreview, setEditorPreview] = useState<'edit' | 'live' | 'preview'>('live');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // 在编辑模式下获取原始Markdown内容
  useEffect(() => {
    async function fetchMarkdownContent() {
      // 在编辑模式下，始终从markdown API获取原始内容，因为post.content可能是HTML
      if (mode === 'edit') {
        setIsLoadingContent(true);
        try {
          console.log('Fetching markdown content for slug:', post.slug);
          const response = await fetch(`/api/admin/posts/${post.slug}/markdown`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
            },
            cache: 'no-store' // 禁用缓存，确保获取最新内容
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Received markdown content:', data.content.substring(0, 100) + '...');
            console.log('Content type check - contains HTML tags:', /<[^>]*>/.test(data.content));
            setFormData(prev => ({ ...prev, content: data.content }));
          } else {
            console.error('Error fetching markdown content:', await response.text());
            setError('Failed to load post content. Please try again.');
          }
        } catch (error) {
          console.error('Error fetching markdown content:', error);
          setError('Failed to load post content. Please try again.');
        } finally {
          setIsLoadingContent(false);
        }
      }
    }

    fetchMarkdownContent();
  }, [mode, post.slug]); // 移除post.content依赖

  // 从URL参数中获取数据
  useEffect(() => {
    // 只在新建模式下从URL参数获取数据
    if (mode === 'new') {
      const titleParam = searchParams.get('title');
      const excerptParam = searchParams.get('excerpt');
      const contentParam = searchParams.get('content');
      const slugParam = searchParams.get('slug');
      const dateParam = searchParams.get('date');

      // 检查是否有任何参数存在
      const hasParams = titleParam || excerptParam || contentParam || slugParam || dateParam;

      if (hasParams) {
        setFormData(prevData => {
          const updatedData = { ...prevData };

          if (titleParam) updatedData.title = titleParam;
          if (excerptParam) updatedData.excerpt = excerptParam;
          if (contentParam) updatedData.content = contentParam;
          if (slugParam) updatedData.slug = slugParam;
          if (dateParam) updatedData.date = dateParam;

          return updatedData;
        });
      }
    }
  }, [searchParams, mode]);

  // 获取所有可用分类
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/admin/categories', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('blogAdminToken') || ''}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }

    fetchCategories();
  }, []);

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 如果标题改变且slug为空，自动生成slug
    if (name === 'title' && !formData.slug) {
      const generatedSlug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }

    // 自动保存草稿
    setDraftSaved(false);
  };

  // 初始加载草稿（只在组件初始化时运行一次）
  useEffect(() => {
    if (mode === 'new' && !draftLoaded) {
      const draftKey = 'blog-draft-new';
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          const draftTime = new Date(parsedDraft.timestamp);
          const formattedTime = draftTime.toLocaleTimeString();

          // 检查草稿是否有实际内容（不只是空的表单）
          const hasContent = parsedDraft.data.title ||
                           parsedDraft.data.content ||
                           parsedDraft.data.excerpt ||
                           (parsedDraft.data.categories && parsedDraft.data.categories.length > 0);

          if (hasContent) {
            const shouldLoad = confirm(
              `Found a draft saved at ${formattedTime}. Load it?\n\n` +
              `Click "Cancel" to start fresh and clear the draft.`
            );

            if (shouldLoad) {
              setFormData(parsedDraft.data);
              setLastSavedTime(formattedTime);
            } else {
              // 用户选择不加载，清除草稿
              localStorage.removeItem(draftKey);
            }
          }
        } catch (error) {
          console.error('Error loading draft:', error);
          // 如果草稿数据损坏，清除它
          localStorage.removeItem(draftKey);
        }
      }

      setDraftLoaded(true);
    }
  }, [mode, draftLoaded]);

  // 自动保存草稿
  useEffect(() => {
    if (!draftLoaded) return; // 等待草稿加载完成

    const draftKey = mode === 'new' ? 'blog-draft-new' : `blog-draft-${post.slug}`;

    // 设置自动保存定时器
    const autoSaveInterval = setInterval(() => {
      // 只有当表单数据有变化且未保存时才保存
      if (!draftSaved) {
        const now = new Date();
        const draftData = {
          data: formData,
          timestamp: now.toISOString()
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        setDraftSaved(true);
        setLastSavedTime(now.toLocaleTimeString());
      }
    }, 30000); // 每30秒自动保存一次

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [formData, draftSaved, mode, post.slug, draftLoaded]);

  // 处理分类变化
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setFormData(prev => ({ ...prev, categories: selectedOptions }));
  };

  // 添加新分类
  const handleAddCategory = () => {
    if (newCategory && !availableCategories.includes(newCategory)) {
      setAvailableCategories(prev => [...prev, newCategory]);
      setFormData(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
      setNewCategory('');
    }
  };

  // 处理图片上传
  const handleImageUploaded = (imageUrl: string) => {
    const imageMarkdown = `![Image](${imageUrl})`;
    setFormData(prev => ({
      ...prev,
      content: prev.content + '\n\n' + imageMarkdown
    }));
    setShowImageUploader(false);
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const url = mode === 'new'
        ? '/api/admin/posts'
        : `/api/admin/posts/${post.slug}`;

      const method = mode === 'new' ? 'POST' : 'PUT';
      const token = localStorage.getItem('blogAdminToken') || '';

      // 调试日志
      console.log('Submitting post:', {
        mode,
        url,
        method,
        hasToken: !!token,
        formData: {
          title: formData.title,
          excerpt: formData.excerpt,
          date: formData.date,
          categories: formData.categories,
          slug: formData.slug,
          contentLength: formData.content?.length || 0
        }
      });

      // 检查认证状态
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }

      // 验证必要字段
      const requiredFields = ['title', 'excerpt', 'date', 'categories', 'content'];
      const missingFields = requiredFields.filter(field => {
        const value = formData[field as keyof typeof formData];
        return !value || (Array.isArray(value) && value.length === 0);
      });

      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      // 验证内容格式 - 确保是Markdown而不是HTML
      const content = formData.content || '';
      const htmlTagRegex = /<[^>]*>/g;
      const htmlTags = content.match(htmlTagRegex);

      // 如果检测到大量HTML标签，警告用户
      if (htmlTags && htmlTags.length > 5) {
        const confirmSubmit = confirm(
          'Warning: The content appears to contain HTML tags. ' +
          'This may cause display issues. Do you want to continue?'
        );
        if (!confirmSubmit) {
          return;
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('Post saved successfully:', data);
        setSuccess(mode === 'new' ? 'Post created successfully!' : 'Post updated successfully!');

        // 清除草稿
        if (mode === 'new') {
          localStorage.removeItem('blog-draft-new');
          setLastSavedTime(null);
        }

        // 如果是新建文章，重定向到编辑页面
        if (mode === 'new') {
          router.push(`/admin/posts/${data.slug}`);
        }
      } else {
        const errorData = await response.json();
        console.error('Server error:', response.status, errorData);
        setError(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Fetch error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error
      });

      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error: Unable to connect to the server. Please check if the server is running and try again.');
      } else {
        setError(`An error occurred while saving the post: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 渲染Markdown预览
  const renderMarkdownPreview = () => {
    // 这里应该使用一个Markdown渲染库，但为了简单起见，我们只做基本的处理
    const html = formData.content
      .replace(/# (.*)/g, '<h1>$1</h1>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full h-auto" />')
      .replace(/- (.*)/g, '<li>$1</li>')
      .replace(/<li>.*<\/li>/g, match => `<ul>${match}</ul>`)
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return (
      <div
        className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
      />
    );
  };

  // 打开预览窗口
  const openPreview = () => {
    // 创建一个新窗口
    const previewWindow = window.open('', '_blank');

    if (previewWindow) {
      // 使用DOM操作替代document.write
      const doc = previewWindow.document;

      // 创建HTML结构
      doc.open();

      // 创建head元素
      const head = doc.createElement('head');

      // 设置标题
      const title = doc.createElement('title');
      title.textContent = `${formData.title} - Preview`;
      head.appendChild(title);

      // 设置meta标签
      const metaCharset = doc.createElement('meta');
      metaCharset.setAttribute('charset', 'UTF-8');
      head.appendChild(metaCharset);

      const metaViewport = doc.createElement('meta');
      metaViewport.setAttribute('name', 'viewport');
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      head.appendChild(metaViewport);

      // 添加样式
      const style = doc.createElement('style');
      style.textContent = `
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background-color: #f9f9f9;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #e0e0e0;
          }
          a {
            color: #3b82f6;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #f0f0f0;
          }
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        h2 {
          font-size: 1.8rem;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #ddd;
        }
        h3 {
          font-size: 1.5rem;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        p {
          margin-bottom: 1.5rem;
        }
        a {
          color: #0066cc;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        code {
          background-color: #f0f0f0;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: monospace;
        }
        @media (prefers-color-scheme: dark) {
          code {
            background-color: #2a2a2a;
          }
        }
        img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        .meta {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 2rem;
        }
        @media (prefers-color-scheme: dark) {
          .meta {
            color: #aaa;
          }
        }
        .categories {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .category {
          background-color: #e0e0e0;
          color: #333;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
        }
        @media (prefers-color-scheme: dark) {
          .category {
            background-color: #3a3a3a;
            color: #e0e0e0;
          }
        }
      `;
      head.appendChild(style);

      // 创建body和内容
      const body = doc.createElement('body');

      // 创建文章容器
      const article = doc.createElement('article');

      // 添加标题
      const h1 = doc.createElement('h1');
      h1.textContent = formData.title;
      article.appendChild(h1);

      // 添加元数据
      const meta = doc.createElement('div');
      meta.className = 'meta';

      const dateDiv = doc.createElement('div');
      dateDiv.textContent = formData.date;
      meta.appendChild(dateDiv);

      const categoriesDiv = doc.createElement('div');
      categoriesDiv.className = 'categories';

      formData.categories.forEach(category => {
        const span = doc.createElement('span');
        span.className = 'category';
        span.textContent = category;
        categoriesDiv.appendChild(span);
      });

      meta.appendChild(categoriesDiv);
      article.appendChild(meta);

      // 添加内容
      const contentDiv = doc.createElement('div');
      contentDiv.innerHTML = renderMarkdownPreview().props.dangerouslySetInnerHTML.__html;
      article.appendChild(contentDiv);

      body.appendChild(article);

      // 将head和body添加到文档
      const html = doc.createElement('html');
      html.appendChild(head);
      html.appendChild(body);

      doc.appendChild(html);
      doc.close();
    }
  };

  return (
    <div className="card-apple p-6">
      {error && (
        <div className="bg-red-900/30 text-red-300 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 text-green-300 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      {lastSavedTime && (
        <div className="text-xs text-apple-gray-400 mb-6 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Draft automatically saved at {lastSavedTime}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-apple-gray-300 mb-1">
            Excerpt
          </label>
          <textarea
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-apple-gray-300 mb-1">
              Categories
            </label>
            <div className="flex gap-2">
              <select
                multiple
                name="categories"
                value={formData.categories}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 border border-apple-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
              >
                {availableCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div className="flex">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category"
                  className="w-32 px-4 py-2 border border-apple-gray-700 rounded-l-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-800 text-white"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-2 bg-primary text-white rounded-r-lg hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
            </div>
            <p className="text-xs text-apple-gray-400 mt-1">
              Hold Ctrl (or Cmd) to select multiple categories
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-apple-gray-300">
              Content (Rich Text Editor)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowImageUploader(!showImageUploader)}
                className="text-xs px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600"
                title="Upload Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={openPreview}
                className="text-xs px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                title="Open preview in new window"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>

          {showImageUploader && (
            <div className="mb-4">
              <ImageUploader
                onImageUploaded={handleImageUploaded}
                className="w-full"
              />
            </div>
          )}

          {isLoadingContent ? (
            <div className="min-h-[400px] border border-apple-gray-700 rounded-lg p-4 bg-apple-gray-800 flex items-center justify-center">
              <div className="text-apple-gray-400">
                <svg className="animate-spin h-8 w-8 mr-3 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading content...
              </div>
            </div>
          ) : (
            <div className="w-full">
              {/* 编辑器模式切换 */}
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-apple-gray-400">编辑器模式:</span>
                <div className="flex rounded-lg bg-apple-gray-800 p-1">
                  <button
                    type="button"
                    onClick={() => setEditorPreview('edit')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      editorPreview === 'edit'
                        ? 'bg-apple-blue text-white'
                        : 'text-apple-gray-400 hover:text-white'
                    }`}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorPreview('live')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      editorPreview === 'live'
                        ? 'bg-apple-blue text-white'
                        : 'text-apple-gray-400 hover:text-white'
                    }`}
                  >
                    实时预览
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorPreview('preview')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      editorPreview === 'preview'
                        ? 'bg-apple-blue text-white'
                        : 'text-apple-gray-400 hover:text-white'
                    }`}
                  >
                    预览
                  </button>
                </div>
              </div>

              <div className="w-full" data-color-mode="dark">
                {editorError && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
                    <p className="text-red-400 text-sm">编辑器错误: {editorError}</p>
                  </div>
                )}
                <MDEditor
                  value={formData.content}
                  onChange={(value) => {
                    try {
                      console.log('MDEditor onChange:', value?.substring(0, 100) + '...');
                      setFormData(prev => ({ ...prev, content: value || '' }));
                      setEditorError(null);
                    } catch (error) {
                      console.error('MDEditor onChange error:', error);
                      setEditorError(error instanceof Error ? error.message : '未知错误');
                    }
                  }}
                  height={400}
                  preview={editorPreview}
                  hideToolbar={false}
                  visibleDragbar={false}
                  data-color-mode="dark"
                  previewOptions={{
                    rehypePlugins: [],
                    remarkPlugins: [],
                    skipHtml: false,
                    allowElement: () => {
                      // 允许所有标准HTML元素
                      return true;
                    }
                  }}
                  textareaProps={{
                    placeholder: '请输入文章内容，支持Markdown语法...',
                    style: {
                      fontSize: 14,
                      lineHeight: 1.6,
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Link
              href="/admin/posts"
              className="btn-apple btn-apple-secondary"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => {
                const draftKey = mode === 'new' ? 'blog-draft-new' : `blog-draft-${post.slug}`;
                const now = new Date();
                const draftData = {
                  data: formData,
                  timestamp: now.toISOString()
                };
                localStorage.setItem(draftKey, JSON.stringify(draftData));
                setDraftSaved(true);
                setLastSavedTime(now.toLocaleTimeString());
                setSuccess('Draft saved successfully!');
                setTimeout(() => setSuccess(null), 3000);
              }}
              className="btn-apple bg-apple-gray-300 dark:bg-apple-gray-700 text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-400 dark:hover:bg-apple-gray-600"
            >
              Save Draft
            </button>

            {mode === 'new' && lastSavedTime && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear the saved draft? This action cannot be undone.')) {
                    const draftKey = 'blog-draft-new';
                    localStorage.removeItem(draftKey);
                    setLastSavedTime(null);
                    setDraftSaved(false);
                    setSuccess('Draft cleared successfully!');
                    setTimeout(() => setSuccess(null), 3000);
                  }
                }}
                className="btn-apple bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                title="Clear saved draft"
              >
                Clear Draft
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative group">
              <button
                type="button"
                className="btn-apple bg-purple-600 hover:bg-purple-700 text-white"
              >
                AI Assist
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-apple-gray-800 rounded-lg shadow-lg overflow-hidden z-10 hidden group-hover:block">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/ai-assistant?title=${encodeURIComponent(formData.title)}`)}
                    className="block w-full text-left px-4 py-2 text-sm text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700"
                  >
                    Generate Full Article
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/ai-assistant?title=${encodeURIComponent(formData.title)}&selectedTemplate=introduction`)}
                    className="block w-full text-left px-4 py-2 text-sm text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700"
                  >
                    Generate Introduction
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/ai-assistant?title=${encodeURIComponent(formData.title)}&selectedTemplate=conclusion`)}
                    className="block w-full text-left px-4 py-2 text-sm text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700"
                  >
                    Generate Conclusion
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/ai-assistant?title=${encodeURIComponent(formData.title)}&excerpt=${encodeURIComponent(formData.excerpt)}&selectedTemplate=seo-optimization`)}
                    className="block w-full text-left px-4 py-2 text-sm text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700"
                  >
                    SEO Optimization
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/ai-assistant?title=${encodeURIComponent(formData.title)}&content=${encodeURIComponent(formData.content)}&selectedTemplate=rewrite`)}
                    className="block w-full text-left px-4 py-2 text-sm text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700"
                  >
                    Rewrite Content
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-apple btn-apple-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : mode === 'new' ? 'Create Post' : 'Update Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// 导出包装在Suspense中的组件
export default function PostEditor(props: PostEditorProps) {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <PostEditorContent {...props} />
    </Suspense>
  );
}
