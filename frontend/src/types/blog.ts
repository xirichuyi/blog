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
  featured?: boolean;
  status?: 'draft' | 'published';
}

export interface Category {
  id: string;
  name: string;
  count: number;
  icon: string;
}

export interface BlogDataState {
  articles: Article[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

export interface BlogDataActions {
  fetchArticles: () => Promise<void>;
  fetchArticleById: (id: string) => Promise<Article | null>;
  fetchCategories: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export type UseBlogDataReturn = BlogDataState & BlogDataActions;
