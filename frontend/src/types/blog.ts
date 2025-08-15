// Blog-related type definitions

export interface Article {
  id: string;
  title: string;
  content?: string;
  excerpt: string;
  author: string;
  publishDate: string;
  readTime: number;
  category: string;
  tags: string[];
  imageUrl?: string;
  coverImage?: string; // Add coverImage for compatibility
  featured?: boolean;
  status?: 'draft' | 'published' | 'private';
}

export interface Category {
  id: string;
  name: string;
  count: number;
  icon: string;
}

export interface Tag {
  id: string;
  name: string;
  count: number;
}

export interface BlogDataState {
  articles: Article[];
  categories: Category[];
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
}

export interface BlogDataActions {
  fetchArticles: () => Promise<void>;
  fetchArticleById: (id: string) => Promise<Article | null>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchArticlesByCategory: (categoryId: string) => Promise<void>;
  fetchArticlesByTag: (tagName: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export type UseBlogDataReturn = BlogDataState & BlogDataActions;
