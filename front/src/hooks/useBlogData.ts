import { useState, useEffect, useCallback } from 'react';
import type {
  Article,
  Category,
  BlogDataState,
  BlogDataActions,
  UseBlogDataReturn
} from '../types/blog';

// Re-export types for convenience
export type { Article, Category };

// Mock API functions - replace with actual API calls
const mockApiDelay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));

const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Getting Started with Material Design 3',
    excerpt: 'Learn how to implement Material Design 3 in your React applications with practical examples and best practices.',
    author: 'Cyrus Chen',
    publishDate: '2024-01-15',
    readTime: 8,
    category: 'Design',
    tags: ['Material Design', 'React', 'UI/UX'],
    imageUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=200&fit=crop',
    featured: true,
    content: `
      <h2>Introduction</h2>
      <p>Material Design 3 represents the latest evolution of Google's design system...</p>
      <!-- Full content would be here -->
    `
  },
  {
    id: '2',
    title: 'Advanced React Patterns for Modern Applications',
    excerpt: 'Explore advanced React patterns including compound components, render props, and custom hooks.',
    author: 'Cyrus Chen',
    publishDate: '2024-01-12',
    readTime: 12,
    category: 'Development',
    tags: ['React', 'JavaScript', 'Patterns'],
    imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=200&fit=crop'
  },
  {
    id: '3',
    title: 'Building Responsive Web Applications',
    excerpt: 'Master the art of creating responsive web applications that work seamlessly across all devices.',
    author: 'Cyrus Chen',
    publishDate: '2024-01-10',
    readTime: 6,
    category: 'Development',
    tags: ['CSS', 'Responsive Design', 'Mobile'],
    imageUrl: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=200&fit=crop'
  },
  {
    id: '4',
    title: 'The Future of Web Development',
    excerpt: 'Discover emerging trends and technologies that are shaping the future of web development.',
    author: 'Cyrus Chen',
    publishDate: '2024-01-08',
    readTime: 10,
    category: 'Technology',
    tags: ['Web Development', 'Trends', 'Future'],
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop'
  },
  {
    id: '5',
    title: 'Optimizing Performance in React Applications',
    excerpt: 'Learn essential techniques for optimizing React application performance and user experience.',
    author: 'Cyrus Chen',
    publishDate: '2024-01-05',
    readTime: 9,
    category: 'Development',
    tags: ['React', 'Performance', 'Optimization']
  },
  {
    id: '6',
    title: 'Design Systems and Component Libraries',
    excerpt: 'How to build and maintain scalable design systems and component libraries for your team.',
    author: 'Cyrus Chen',
    publishDate: '2024-01-03',
    readTime: 7,
    category: 'Design',
    tags: ['Design Systems', 'Components', 'Scalability']
  }
];

const mockCategories: Category[] = [
  { id: 'all', name: 'All Articles', count: mockArticles.length, icon: 'article' },
  { id: 'development', name: 'Development', count: 3, icon: 'code' },
  { id: 'design', name: 'Design', count: 2, icon: 'palette' },
  { id: 'technology', name: 'Technology', count: 1, icon: 'computer' }
];

const useBlogData = (): UseBlogDataReturn => {
  const [state, setState] = useState<BlogDataState>({
    articles: [],
    categories: [],
    isLoading: false,
    error: null
  });

  const fetchArticles = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await mockApiDelay();
      setState(prev => ({
        ...prev,
        articles: mockArticles,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch articles',
        isLoading: false
      }));
    }
  }, []);

  const fetchArticleById = useCallback(async (id: string): Promise<Article | null> => {
    try {
      await mockApiDelay(400);
      const article = mockArticles.find(article => article.id === id);
      return article || null;
    } catch (error) {
      console.error('Failed to fetch article:', error);
      return null;
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await mockApiDelay(300);
      setState(prev => ({
        ...prev,
        categories: mockCategories,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
        isLoading: false
      }));
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchArticles(), fetchCategories()]);
  }, [fetchArticles, fetchCategories]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    ...state,
    fetchArticles,
    fetchArticleById,
    fetchCategories,
    refreshData
  };
};

export default useBlogData;
