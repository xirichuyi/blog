import { getAllCategories, getAllPosts } from '@/lib/blog';
import Link from 'next/link';

export default function AdminCategories() {
  const categories = getAllCategories();
  const posts = getAllPosts();

  // 计算每个分类下的文章数量
  const categoryCounts = categories.reduce((acc, category) => {
    acc[category] = posts.filter(post => post.categories.includes(category)).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category} className="card-apple p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold mb-1 text-white">{category}</h2>
                <p className="text-sm text-apple-gray-400">
                  {categoryCounts[category]} {categoryCounts[category] === 1 ? 'post' : 'posts'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/categories/${category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-apple-gray-300 hover:text-primary"
                  target="_blank"
                >
                  <span className="sr-only">View</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-apple-gray-300 mb-2">Recent posts in this category:</h3>
              <ul className="text-sm space-y-1">
                {posts
                  .filter(post => post.categories.includes(category))
                  .slice(0, 3)
                  .map(post => (
                    <li key={post.id} className="truncate">
                      <Link
                        href={`/admin/posts/${post.slug}`}
                        className="text-apple-gray-400 hover:text-primary"
                      >
                        {post.title}
                      </Link>
                    </li>
                  ))}
                {categoryCounts[category] > 3 && (
                  <li className="text-primary text-xs">
                    + {categoryCounts[category] - 3} more posts
                  </li>
                )}
                {categoryCounts[category] === 0 && (
                  <li className="text-apple-gray-400 italic">
                    No posts in this category
                  </li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
