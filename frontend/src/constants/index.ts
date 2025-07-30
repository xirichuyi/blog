/**
 * 应用程序常量配置
 */

// API 配置
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  CACHE_TTL: 5 * 60 * 1000, // 5分钟
} as const;

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  BLOG_PAGE_SIZE: 6,
  ADMIN_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// 动画配置
export const ANIMATIONS = {
  DURATION: {
    FAST: 0.2,
    NORMAL: 0.3,
    SLOW: 0.5,
    VERY_SLOW: 0.8,
  },
  EASING: {
    EASE_OUT: [0.25, 0.46, 0.45, 0.94],
    EASE_IN_OUT: [0.4, 0, 0.2, 1],
    BOUNCE: [0.68, -0.55, 0.265, 1.55],
  },
  STAGGER: {
    CHILDREN: 0.1,
    FAST: 0.05,
    SLOW: 0.15,
  },
} as const;

// 路由路径
export const ROUTES = {
  HOME: '/',
  BLOG: '/blog',
  CATEGORIES: '/categories',
  ABOUT: '/about',
  ADMIN: {
    ROOT: '/admin',
    LOGIN: '/admin/login',
    DASHBOARD: '/admin',
    POSTS: '/admin/posts',
    CATEGORIES: '/admin/categories',
    MEDIA: '/admin/media',
    SETTINGS: '/admin/settings',
    AI_ASSISTANT: '/admin/ai-assistant',
  },
} as const;

// 主题配置
export const THEME = {
  COLORS: {
    PRIMARY: '#3b82f6',
    PRIMARY_LIGHT: '#60a5fa',
    PRIMARY_DARK: '#1d4ed8',
    SECONDARY: '#6b7280',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
  SPACING: {
    CONTAINER_PADDING: '1rem',
    SECTION_PADDING: '5rem',
    CARD_PADDING: '1.5rem',
  },
} as const;

// 表单验证
export const VALIDATION = {
  POST: {
    TITLE_MIN_LENGTH: 3,
    TITLE_MAX_LENGTH: 200,
    EXCERPT_MIN_LENGTH: 10,
    EXCERPT_MAX_LENGTH: 500,
    CONTENT_MIN_LENGTH: 50,
    SLUG_PATTERN: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  CATEGORY: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    NAME_PATTERN: /^[a-zA-Z0-9\s-]+$/,
  },
  CHAT: {
    MESSAGE_MAX_LENGTH: 1000,
    MESSAGE_MIN_LENGTH: 1,
  },
} as const;

// 文件上传配置
export const UPLOAD = {
  IMAGE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  DOCUMENT: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
    ALLOWED_EXTENSIONS: ['.pdf', '.txt', '.doc', '.docx'],
  },
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  THEME: 'cyrus-blog-theme',
  CHAT_HISTORY: 'cyrus-blog-chat-history',
  AUTH_TOKEN: 'cyrus-blog-auth-token',
  USER_PREFERENCES: 'cyrus-blog-user-preferences',
  DRAFT_POSTS: 'cyrus-blog-draft-posts',
} as const;

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK: '网络连接失败，请检查网络连接',
  SERVER: '服务器错误，请稍后重试',
  UNAUTHORIZED: '未授权访问，请重新登录',
  FORBIDDEN: '权限不足，无法执行此操作',
  NOT_FOUND: '请求的资源不存在',
  VALIDATION: '输入数据格式不正确',
  UPLOAD: '文件上传失败',
  GENERIC: '操作失败，请重试',
} as const;

// 成功消息
export const SUCCESS_MESSAGES = {
  POST_CREATED: '文章创建成功',
  POST_UPDATED: '文章更新成功',
  POST_DELETED: '文章删除成功',
  CATEGORY_CREATED: '分类创建成功',
  CATEGORY_UPDATED: '分类更新成功',
  CATEGORY_DELETED: '分类删除成功',
  IMAGE_UPLOADED: '图片上传成功',
  SETTINGS_SAVED: '设置保存成功',
} as const;

// 加载状态文本
export const LOADING_MESSAGES = {
  LOADING: '加载中...',
  SAVING: '保存中...',
  UPLOADING: '上传中...',
  DELETING: '删除中...',
  PROCESSING: '处理中...',
} as const;

// 聊天助手配置
export const CHAT_CONFIG = {
  MAX_HISTORY_LENGTH: 10,
  TYPING_DELAY: 1000,
  QUICK_QUESTIONS: [
    "Tell me about Cyrus",
    "What are his technical skills?",
    "Show me recent blog posts",
    "How can I contact him?"
  ],
  WELCOME_MESSAGE: "Hi! I'm Cyrus's AI assistant. How can I help you today?",
} as const;

// 管理员导航配置
export const ADMIN_NAV_ITEMS = [
  {
    name: 'Dashboard',
    path: '/admin',
    icon: 'home',
    description: 'Overview & Analytics'
  },
  {
    name: 'Posts',
    path: '/admin/posts',
    icon: 'document-text',
    description: 'Manage Articles'
  },
  {
    name: 'Categories',
    path: '/admin/categories',
    icon: 'tag',
    description: 'Organize Content'
  },
  {
    name: 'Media',
    path: '/admin/media',
    icon: 'photo',
    description: 'Images & Files'
  },
  {
    name: 'Settings',
    path: '/admin/settings',
    icon: 'cog',
    description: 'System Config'
  },
] as const;

// 公共导航配置
export const PUBLIC_NAV_ITEMS = [
  { href: "/", label: "Home", delay: 0.1 },
  { href: "/blog", label: "Blog", delay: 0.2 },
  { href: "/categories", label: "Categories", delay: 0.25 },
  { href: "/about", label: "About", delay: 0.3 },
] as const;

// 社交媒体链接
export const SOCIAL_LINKS = [
  { href: "#", label: "LinkedIn", delay: 0.1 },
  { href: "#", label: "Twitter", delay: 0.2 },
  { href: "#", label: "GitHub", delay: 0.3 },
] as const;
