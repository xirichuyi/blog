import { useState, useEffect, useCallback } from 'react';
import type {
  Article,
  Category,
  BlogDataState,
  BlogDataActions,
  UseBlogDataReturn
} from '../types';

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
      <h2>Introduction to Material Design 3</h2>
      <p>Material Design 3 represents the latest evolution of Google's design system, bringing fresh perspectives on color, typography, and component design. This comprehensive guide will walk you through implementing Material Design 3 in your React applications.</p>

      <h2>Key Features of Material Design 3</h2>
      <p>Material Design 3 introduces several groundbreaking features that enhance user experience:</p>
      <ul>
        <li><strong>Dynamic Color:</strong> Adaptive color palettes that respond to user preferences</li>
        <li><strong>Improved Typography:</strong> Enhanced readability with new font scales</li>
        <li><strong>Updated Components:</strong> Refined components with better accessibility</li>
        <li><strong>Motion Design:</strong> Smooth animations that guide user attention</li>
      </ul>

      <h3>Getting Started with Implementation</h3>
      <p>To begin implementing Material Design 3 in your React project, you'll need to install the necessary dependencies and configure your design tokens.</p>

      <pre><code>npm install @material/web
npm install @material/material-color-utilities</code></pre>

      <h3>Setting Up Your Color Scheme</h3>
      <p>One of the most exciting features of Material Design 3 is the dynamic color system. Here's how you can implement it:</p>

      <blockquote>
        "Material Design 3's dynamic color system creates a cohesive and accessible color palette that adapts to user preferences and content."
      </blockquote>

      <h2>Best Practices</h2>
      <p>When implementing Material Design 3, keep these best practices in mind:</p>
      <ol>
        <li>Always prioritize accessibility in your color choices</li>
        <li>Use the design tokens consistently across your application</li>
        <li>Test your implementation across different devices and screen sizes</li>
        <li>Leverage the motion design principles for better user guidance</li>
      </ol>

      <h3>Component Integration</h3>
      <p>Material Design 3 components are designed to work seamlessly together. Here's an example of how to integrate multiple components:</p>

      <pre><code>import { MdFilledButton, MdOutlinedTextField } from '@material/web';

function MyComponent() {
  return (
    &lt;div&gt;
      &lt;MdOutlinedTextField label="Enter your name" /&gt;
      &lt;MdFilledButton&gt;Submit&lt;/MdFilledButton&gt;
    &lt;/div&gt;
  );
}</code></pre>

      <h2>Conclusion</h2>
      <p>Material Design 3 offers a powerful foundation for creating modern, accessible, and beautiful user interfaces. By following the principles and practices outlined in this guide, you'll be well-equipped to create exceptional user experiences.</p>

      <p><em>Remember to always test your implementations thoroughly and gather user feedback to ensure your design decisions are effective.</em></p>
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
    imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=200&fit=crop',
    content: `
      <h2>Mastering Advanced React Patterns</h2>
      <p>As React applications grow in complexity, understanding advanced patterns becomes crucial for maintaining clean, reusable, and efficient code. This comprehensive guide explores the most important patterns every React developer should master.</p>

      <h2>1. Compound Components Pattern</h2>
      <p>The compound components pattern allows you to create components that work together to form a complete UI element, similar to how HTML elements like <code>&lt;select&gt;</code> and <code>&lt;option&gt;</code> work together.</p>

      <pre><code>function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    &lt;div className="tabs"&gt;
      {React.Children.map(children, child =&gt;
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    &lt;/div&gt;
  );
}

Tabs.TabList = function TabList({ children, activeTab, setActiveTab }) {
  return (
    &lt;div className="tab-list"&gt;
      {React.Children.map(children, (child, index) =&gt;
        React.cloneElement(child, {
          isActive: activeTab === index,
          onClick: () =&gt; setActiveTab(index)
        })
      )}
    &lt;/div&gt;
  );
};</code></pre>

      <h3>Benefits of Compound Components</h3>
      <ul>
        <li><strong>Flexibility:</strong> Users can compose components in different ways</li>
        <li><strong>Separation of Concerns:</strong> Each component has a single responsibility</li>
        <li><strong>Implicit State Sharing:</strong> Components share state without prop drilling</li>
      </ul>

      <h2>2. Render Props Pattern</h2>
      <p>Render props is a technique for sharing code between React components using a prop whose value is a function.</p>

      <blockquote>
        "The render props pattern is particularly useful when you need to share stateful logic between components while keeping the rendering flexible."
      </blockquote>

      <pre><code>function DataFetcher({ url, render }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() =&gt; {
    fetch(url)
      .then(response =&gt; response.json())
      .then(data =&gt; {
        setData(data);
        setLoading(false);
      })
      .catch(error =&gt; {
        setError(error);
        setLoading(false);
      });
  }, [url]);

  return render({ data, loading, error });
}</code></pre>

      <h2>3. Custom Hooks Pattern</h2>
      <p>Custom hooks allow you to extract component logic into reusable functions, making your code more modular and testable.</p>

      <h3>Example: useLocalStorage Hook</h3>
      <pre><code>function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() =&gt; {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value) =&gt; {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}</code></pre>

      <h2>Best Practices</h2>
      <ol>
        <li><strong>Choose the Right Pattern:</strong> Each pattern solves different problems</li>
        <li><strong>Keep It Simple:</strong> Don't over-engineer your solutions</li>
        <li><strong>Test Thoroughly:</strong> Advanced patterns can introduce complexity</li>
        <li><strong>Document Your Code:</strong> Make sure other developers understand your patterns</li>
      </ol>

      <h2>Conclusion</h2>
      <p>Advanced React patterns are powerful tools that can significantly improve your code quality and developer experience. By mastering these patterns, you'll be able to build more maintainable and scalable React applications.</p>

      <p><em>Remember: with great power comes great responsibility. Use these patterns judiciously and always consider the trade-offs.</em></p>
    `
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
    imageUrl: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=200&fit=crop',
    content: `
      <h2>The Art of Responsive Web Design</h2>
      <p>In today's multi-device world, creating responsive web applications isn't just a nice-to-have—it's essential. This guide will teach you the fundamental principles and advanced techniques for building applications that work beautifully across all screen sizes.</p>

      <h2>Core Principles of Responsive Design</h2>
      <p>Responsive design is built on three fundamental principles:</p>

      <h3>1. Fluid Grids</h3>
      <p>Instead of fixed-width layouts, use relative units like percentages and viewport units to create flexible grids that adapt to any screen size.</p>

      <pre><code>.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 5vw, 2rem);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}</code></pre>

      <h3>2. Flexible Images</h3>
      <p>Images should scale with their containers to prevent overflow and maintain aspect ratios.</p>

      <pre><code>img {
  max-width: 100%;
  height: auto;
  display: block;
}

.hero-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}</code></pre>

      <h3>3. Media Queries</h3>
      <p>Use CSS media queries to apply different styles based on device characteristics.</p>

      <blockquote>
        "The best responsive designs are those that feel natural on every device, not just adapted versions of a desktop layout."
      </blockquote>

      <h2>Modern CSS Techniques</h2>
      <p>Modern CSS provides powerful tools for responsive design:</p>

      <h3>CSS Grid and Flexbox</h3>
      <pre><code>/* Responsive navigation */
.nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  .nav {
    flex-direction: column;
    gap: 1rem;
  }
}</code></pre>

      <h3>Container Queries</h3>
      <p>The future of responsive design lies in container queries, which allow components to respond to their container's size rather than the viewport.</p>

      <pre><code>.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: flex;
    align-items: center;
  }
}</code></pre>

      <h2>Performance Considerations</h2>
      <ul>
        <li><strong>Optimize Images:</strong> Use responsive images with srcset and sizes attributes</li>
        <li><strong>Minimize CSS:</strong> Use efficient selectors and avoid unnecessary styles</li>
        <li><strong>Progressive Enhancement:</strong> Start with mobile-first design</li>
        <li><strong>Test on Real Devices:</strong> Emulators can't replace real device testing</li>
      </ul>

      <h2>Testing Your Responsive Design</h2>
      <p>Thorough testing is crucial for responsive design success:</p>
      <ol>
        <li>Use browser developer tools for initial testing</li>
        <li>Test on actual devices when possible</li>
        <li>Check touch targets are appropriately sized (minimum 44px)</li>
        <li>Verify text remains readable at all sizes</li>
        <li>Ensure interactive elements work on touch devices</li>
      </ol>

      <h2>Conclusion</h2>
      <p>Building responsive web applications requires a combination of technical skills, design thinking, and attention to detail. By following these principles and continuously testing your work, you'll create experiences that delight users regardless of their device.</p>

      <p><em>Remember: responsive design is not just about making things fit—it's about creating optimal experiences for every context.</em></p>
    `
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
