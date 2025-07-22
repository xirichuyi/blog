# Cyrus Blog API Documentation

This document outlines the API endpoints required for the Rust backend implementation to support the React frontend.

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication
Admin endpoints require Bearer token authentication:
```
Authorization: Bearer <token>
```

## Data Models

### BlogPost
```typescript
interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string; // ISO 8601 format
  slug: string;
  categories: string[];
  content?: string; // Full markdown content
}
```

### Message (Chat)
```typescript
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}
```

## Public API Endpoints

### 1. Get Blog Posts (Paginated)
```
GET /api/posts?page={page}&limit={limit}
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Posts per page (default: 6)

**Response:**
```json
{
  "posts": [BlogPost],
  "totalPosts": number,
  "totalPages": number
}
```

### 2. Get Single Blog Post
```
GET /api/posts/{slug}
```

**Response:**
```json
BlogPost
```

### 3. Search Blog Posts
```
GET /api/posts?q={query}
```

**Parameters:**
- `q`: Search query string

**Response:**
```json
[BlogPost]
```

### 4. Get All Categories
```
GET /api/categories
```

**Response:**
```json
[string]
```

### 5. Get Posts by Category
```
GET /api/categories/{category}
```

**Response:**
```json
[BlogPost]
```

### 6. Chat with AI Assistant
```
POST /api/chat
```

**Request Body:**
```json
{
  "message": string,
  "conversationHistory": [Message] // Optional, last 5 messages
}
```

**Response:**
```json
{
  "response": string
}
```

## Admin API Endpoints

### 7. Admin Dashboard Data
```
GET /api/admin/dashboard
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [BlogPost],
    "categories": [string],
    "recentPosts": [BlogPost],
    "totalPosts": number,
    "totalCategories": number,
    "latestPost": BlogPost | null
  }
}
```

### 8. Get All Posts (Admin)
```
GET /api/admin/posts
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "posts": [BlogPost],
  "totalPosts": number,
  "totalPages": number
}
```

### 9. Create New Post
```
POST /api/admin/posts
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": string,
  "excerpt": string,
  "date": string,
  "slug": string, // Optional, auto-generated if not provided
  "categories": [string],
  "content": string
}
```

**Response:**
```json
{
  "success": boolean,
  "message": string, // Optional error message
  "post": BlogPost // If successful
}
```

### 10. Update Post
```
PUT /api/admin/posts/{slug}
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": string, // Optional
  "excerpt": string, // Optional
  "date": string, // Optional
  "slug": string, // Optional
  "categories": [string], // Optional
  "content": string // Optional
}
```

**Response:**
```json
{
  "success": boolean,
  "message": string, // Optional error message
  "post": BlogPost // If successful
}
```

### 11. Delete Post
```
DELETE /api/admin/posts/{slug}
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": boolean,
  "message": string // Optional error message
}
```

### 12. AI Content Generation
```
POST /api/admin/ai-assist
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "prompt": string,
  "type": string, // Template type
  "deepseekApiKey": string, // Optional
  "deepseekModel": string // Optional
}
```

**Response:**
```json
{
  "content": string
}
```

### 13. Get Admin Categories
```
GET /api/admin/categories
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[string]
```

## Error Responses

All endpoints should return appropriate HTTP status codes and error messages:

```json
{
  "error": string,
  "status": number // Optional
}
```

### Common Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Implementation Notes

### Authentication
- Use environment variable for admin token validation
- Token should be configurable via `BLOG_ADMIN_TOKEN` environment variable

### File Storage
- Blog posts should be stored as markdown files with frontmatter
- File naming convention: `{slug}.md`
- Directory structure: `data/blog/`

### Markdown Processing
- Support GitHub Flavored Markdown (GFM)
- Extract frontmatter for metadata
- Process markdown content for HTML rendering

### CORS Configuration
- Allow requests from frontend domain
- Support preflight requests for admin endpoints

### Rate Limiting
- Implement rate limiting for public endpoints
- More restrictive limits for AI chat endpoint

### Logging
- Log all admin operations
- Log API errors for debugging

## Future Enhancements

1. **Image Upload**: Support for uploading and serving images
2. **Comments System**: User comments on blog posts
3. **Analytics**: Track page views and popular posts
4. **SEO**: Generate sitemap and RSS feed
5. **Caching**: Implement caching for better performance
