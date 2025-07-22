import type { BlogPost, BlogPostsResponse, AdminDashboardData } from '../types/blog';

// Mock blog posts data
export const mockPosts: BlogPost[] = [
  {
    id: 1,
    title: "Getting Started with React and TypeScript",
    excerpt: "Learn how to set up a modern React application with TypeScript for better development experience.",
    date: "2024-01-15",
    slug: "getting-started-react-typescript",
    categories: ["React", "TypeScript", "Web Development"],
    content: `# Getting Started with React and TypeScript

React and TypeScript make a powerful combination for building modern web applications. In this article, we'll explore how to set up and use them together.

## Why TypeScript?

TypeScript provides static type checking, which helps catch errors early in development and improves code maintainability.

## Setting Up

\`\`\`bash
npx create-react-app my-app --template typescript
\`\`\`

This creates a new React application with TypeScript configuration out of the box.

## Benefits

- Better IDE support
- Catch errors at compile time
- Improved refactoring capabilities
- Better documentation through types`
  },
  {
    id: 2,
    title: "Building Scalable APIs with Rust",
    excerpt: "Explore how Rust's performance and safety features make it ideal for building high-performance backend services.",
    date: "2024-01-10",
    slug: "building-scalable-apis-rust",
    categories: ["Rust", "Backend", "API"],
    content: `# Building Scalable APIs with Rust

Rust has emerged as a powerful language for building high-performance, safe backend services.

## Why Rust for APIs?

- Memory safety without garbage collection
- Excellent performance
- Strong type system
- Great ecosystem with crates like Actix-web and Tokio

## Getting Started

\`\`\`rust
use actix_web::{web, App, HttpResponse, HttpServer, Result};

async fn hello() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json("Hello, World!"))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/hello", web::get().to(hello))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
\`\`\`

This creates a simple HTTP server that responds to GET requests.`
  },
  {
    id: 3,
    title: "Machine Learning in Finance: Quantitative Trading Strategies",
    excerpt: "Discover how machine learning algorithms can be applied to develop sophisticated trading strategies.",
    date: "2024-01-05",
    slug: "machine-learning-finance-trading",
    categories: ["Machine Learning", "Finance", "Trading"],
    content: `# Machine Learning in Finance: Quantitative Trading Strategies

Machine learning has revolutionized the financial industry, particularly in algorithmic trading.

## Common ML Techniques in Trading

1. **Time Series Analysis**: Predicting future price movements
2. **Sentiment Analysis**: Analyzing news and social media
3. **Pattern Recognition**: Identifying chart patterns
4. **Risk Management**: Portfolio optimization

## Implementation Considerations

- Data quality and preprocessing
- Feature engineering
- Model validation and backtesting
- Risk management and position sizing

## Tools and Libraries

- Python: pandas, scikit-learn, TensorFlow
- R: quantmod, PerformanceAnalytics
- Rust: candle, polars for data processing`
  }
];

export const mockCategories = ["React", "TypeScript", "Web Development", "Rust", "Backend", "API", "Machine Learning", "Finance", "Trading"];

// Mock API functions for development
export const mockApi = {
  async getPosts(page: number = 1, limit: number = 6): Promise<BlogPostsResponse> {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const posts = mockPosts.slice(startIndex, endIndex);
    
    return {
      posts,
      totalPosts: mockPosts.length,
      totalPages: Math.ceil(mockPosts.length / limit)
    };
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    return mockPosts.find(post => post.slug === slug) || null;
  },

  async searchPosts(query: string): Promise<BlogPost[]> {
    const lowercaseQuery = query.toLowerCase();
    return mockPosts.filter(post =>
      post.title.toLowerCase().includes(lowercaseQuery) ||
      post.excerpt.toLowerCase().includes(lowercaseQuery) ||
      post.categories.some(cat => cat.toLowerCase().includes(lowercaseQuery))
    );
  },

  async getCategories(): Promise<string[]> {
    return mockCategories;
  },

  async getPostsByCategory(category: string): Promise<BlogPost[]> {
    return mockPosts.filter(post => post.categories.includes(category));
  },

  async getDashboardData(): Promise<AdminDashboardData> {
    return {
      posts: mockPosts,
      categories: mockCategories,
      recentPosts: mockPosts.slice(0, 3),
      totalPosts: mockPosts.length,
      totalCategories: mockCategories.length,
      latestPost: mockPosts[0]
    };
  },

  async sendMessage(_message: string): Promise<string> {
    // Mock AI response
    const responses = [
      "That's an interesting question! Let me help you with that.",
      "Based on my knowledge, I can provide some insights on this topic.",
      "Great question! Here's what I think about that.",
      "I'd be happy to discuss this further. What specific aspect interests you most?",
      "That's a complex topic. Let me break it down for you."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
};

// Environment check - use mock data only when explicitly enabled
export const shouldUseMockData = () => {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
};
