import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import type { BlogPost } from '@/types/blog';
import { adminApi } from '@/services/api';

interface AdvancedPostEditorProps {
  mode: 'new' | 'edit';
}

export default function AdvancedPostEditor({ mode }: AdvancedPostEditorProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const editorRef = useRef<any>(null);
  
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: '',
    content: '',
    categories: [],
    slug: '',
    featuredImage: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!post.title?.trim() || !post.content?.trim()) {
      alert('Title and content are required');
      return;
    }

    setIsSaving(true);
    try {
      const postToSave = {
        ...post,
        title: post.title || '',
        content: post.content || '',
        categories: post.categories || [],
        slug: post.slug || '',
      };

      if (mode === 'new') {
        await adminApi.createPost(postToSave);
      } else {
        await adminApi.updatePost(slug!, postToSave);
      }

      navigate('/admin/posts');
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save post');
    } finally {
      setIsSaving(false);
    }
  }, [post, mode, slug, navigate]);

  useEffect(() => {
    if (mode === 'edit' && slug) {
      setIsLoading(true);
      adminApi.getPost(slug)
        .then(postData => {
          setPost(postData);
        })
        .catch(error => {
          console.error('Error loading post:', error);
          alert('Failed to load post');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [mode, slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Post title..."
            value={post.title || ''}
            onChange={(e) => setPost(prev => ({ ...prev, title: e.target.value }))}
            className="w-full text-2xl font-bold bg-transparent border-none outline-none text-white placeholder-gray-400"
          />
        </div>

        <div className="flex-1">
          <Editor
            height="400px"
            defaultLanguage="markdown"
            value={post.content || ''}
            onChange={(value) => setPost(prev => ({ ...prev, content: value || '' }))}
            theme="vs-dark"
            options={{
              wordWrap: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => navigate('/admin/posts')}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : mode === 'new' ? 'Create Post' : 'Update Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
