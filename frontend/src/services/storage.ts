// Local Storage Service for simulating backend data persistence

import type { Article, MusicTrack } from './types';

const STORAGE_KEYS = {
  POSTS: 'blog_posts',
  MUSIC: 'music_tracks',
  CATEGORIES: 'blog_categories',
} as const;

// Mock data
const INITIAL_POSTS: Article[] = [
  {
    id: '1',
    title: 'Getting Started with React 18',
    excerpt: 'Learn the new features and improvements in React 18',
    content: '# Getting Started with React 18\n\nReact 18 introduces several new features that make building user interfaces more efficient and enjoyable.\n\n## New Features\n\n- **Automatic Batching**: React 18 automatically batches multiple state updates for better performance.\n- **Concurrent Features**: New concurrent features like `startTransition` and `useDeferredValue`.\n- **Suspense Improvements**: Better support for server-side rendering.\n\n## Getting Started\n\n```bash\nnpm install react@18 react-dom@18\n```\n\nStart building amazing applications with React 18!',
    author: 'Admin',
    publishDate: '2024-01-15',
    readTime: 5,
    category: 'React',
    tags: ['react', 'javascript', 'frontend'],
    featured: true,
    status: 'published',
  },
  {
    id: '2',
    title: 'Building Modern APIs with Rust',
    excerpt: 'A comprehensive guide to building APIs using Rust and Axum',
    content: '# Building Modern APIs with Rust\n\nRust is becoming increasingly popular for building high-performance web APIs.\n\n## Why Rust for APIs?\n\n- **Performance**: Rust offers zero-cost abstractions and memory safety.\n- **Reliability**: The type system prevents many common bugs.\n- **Ecosystem**: Great libraries like Axum, Tokio, and SQLx.\n\n## Example with Axum\n\n```rust\nuse axum::{routing::get, Router};\n\n#[tokio::main]\nasync fn main() {\n    let app = Router::new()\n        .route("/", get(|| async { "Hello, World!" }));\n    \n    axum::Server::bind(&"0.0.0.0:3000".parse().unwrap())\n        .serve(app.into_make_service())\n        .await\n        .unwrap();\n}\n```',
    author: 'Admin',
    publishDate: '2024-01-10',
    readTime: 8,
    category: 'Rust',
    tags: ['rust', 'api', 'backend'],
    featured: false,
    status: 'published',
  },
  {
    id: '3',
    title: 'Material Design 3 Best Practices',
    excerpt: 'How to implement Material Design 3 in your web applications',
    content: '# Material Design 3 Best Practices\n\nMaterial Design 3 brings a fresh approach to design systems.\n\n## Key Principles\n\n- **Dynamic Color**: Adaptive color schemes based on user preferences.\n- **Personal**: More expressive and customizable interfaces.\n- **Accessible**: Better accessibility features built-in.\n\n## Implementation Tips\n\n1. Use the official Material Web Components\n2. Follow the color system guidelines\n3. Implement proper motion and transitions\n4. Test for accessibility\n\nMaterial Design 3 makes it easier to create beautiful, accessible interfaces.',
    author: 'Admin',
    publishDate: '2024-01-05',
    readTime: 6,
    category: 'Design',
    tags: ['design', 'ui', 'material'],
    featured: false,
    status: 'published',
  },
];

const INITIAL_MUSIC: MusicTrack[] = [
  {
    id: '1',
    title: 'Ambient Coding',
    artist: 'Dev Sounds',
    album: 'Focus Music',
    duration: 240,
    fileUrl: '/music/ambient-coding.mp3',
    coverUrl: '/images/ambient-cover.jpg',
    genre: 'Ambient',
    uploadDate: '2024-01-15',
    fileSize: 5.2,
    status: 'active',
  },
  {
    id: '2',
    title: 'Electronic Beats',
    artist: 'Code Rhythm',
    album: 'Programming Vibes',
    duration: 180,
    fileUrl: '/music/electronic-beats.mp3',
    coverUrl: '/images/electronic-cover.jpg',
    genre: 'Electronic',
    uploadDate: '2024-01-10',
    fileSize: 4.1,
    status: 'active',
  },
  {
    id: '3',
    title: 'Lo-Fi Study',
    artist: 'Chill Dev',
    duration: 200,
    fileUrl: '/music/lofi-study.mp3',
    genre: 'Lo-Fi',
    uploadDate: '2024-01-05',
    fileSize: 3.8,
    status: 'active',
  },
];

class StorageService {
  // Initialize storage with mock data if empty
  private initializeStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(INITIAL_POSTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MUSIC)) {
      localStorage.setItem(STORAGE_KEYS.MUSIC, JSON.stringify(INITIAL_MUSIC));
    }
  }

  // Posts
  getPosts(): Article[] {
    this.initializeStorage();
    const posts = localStorage.getItem(STORAGE_KEYS.POSTS);
    return posts ? JSON.parse(posts) : [];
  }

  getPost(id: string): Article | null {
    const posts = this.getPosts();
    return posts.find(post => post.id === id) || null;
  }

  savePost(post: Article): Article {
    const posts = this.getPosts();
    const existingIndex = posts.findIndex(p => p.id === post.id);

    if (existingIndex >= 0) {
      posts[existingIndex] = post;
    } else {
      posts.push(post);
    }

    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    return post;
  }

  deletePost(id: string): boolean {
    const posts = this.getPosts();
    const filteredPosts = posts.filter(post => post.id !== id);

    if (filteredPosts.length !== posts.length) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(filteredPosts));
      return true;
    }

    return false;
  }

  deletePosts(ids: string[]): boolean {
    const posts = this.getPosts();
    const filteredPosts = posts.filter(post => !ids.includes(post.id));

    if (filteredPosts.length !== posts.length) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(filteredPosts));
      return true;
    }

    return false;
  }

  // Music
  getMusicTracks(): MusicTrack[] {
    this.initializeStorage();
    const tracks = localStorage.getItem(STORAGE_KEYS.MUSIC);
    return tracks ? JSON.parse(tracks) : [];
  }

  getMusicTrack(id: string): MusicTrack | null {
    const tracks = this.getMusicTracks();
    return tracks.find(track => track.id === id) || null;
  }

  saveMusicTrack(track: MusicTrack): MusicTrack {
    const tracks = this.getMusicTracks();
    const existingIndex = tracks.findIndex(t => t.id === track.id);

    if (existingIndex >= 0) {
      tracks[existingIndex] = track;
    } else {
      tracks.push(track);
    }

    localStorage.setItem(STORAGE_KEYS.MUSIC, JSON.stringify(tracks));
    return track;
  }

  deleteMusicTrack(id: string): boolean {
    const tracks = this.getMusicTracks();
    const filteredTracks = tracks.filter(track => track.id !== id);

    if (filteredTracks.length !== tracks.length) {
      localStorage.setItem(STORAGE_KEYS.MUSIC, JSON.stringify(filteredTracks));
      return true;
    }

    return false;
  }

  deleteMusicTracks(ids: string[]): boolean {
    const tracks = this.getMusicTracks();
    const filteredTracks = tracks.filter(track => !ids.includes(track.id));

    if (filteredTracks.length !== tracks.length) {
      localStorage.setItem(STORAGE_KEYS.MUSIC, JSON.stringify(filteredTracks));
      return true;
    }

    return false;
  }

  // Utility
  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const storageService = new StorageService();
export default storageService;
