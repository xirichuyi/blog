"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../../components/PageTransition";

// 定义博客文章的类型
interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  categories: string[];
}

interface BlogClientProps {
  blogPosts: BlogPost[];
}

export default function BlogClient({ blogPosts }: BlogClientProps) {
  return (
    <PageTransition>
      <div className="container-apple py-8 sm:py-10 md:py-24">
        <motion.header
          className="mb-10 md:mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6">Blog</h1>
          <p className="text-lg sm:text-xl text-apple-gray-600 dark:text-apple-gray-300 max-w-2xl mx-auto px-2 sm:px-0">
            Insights and articles on business, technology, and professional growth.
          </p>
        </motion.header>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          {blogPosts.map((post, index) => (
            <motion.article
              key={post.id}
              className="card-apple group w-full"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="h-32 sm:h-40 md:h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute w-24 sm:w-28 md:w-32 h-24 sm:h-28 md:h-32 rounded-full bg-white/20 -top-10 -right-10 group-hover:scale-125 transition-transform duration-700"></div>
                <div className="absolute w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-full bg-primary/30 bottom-5 -left-10 group-hover:scale-110 transition-transform duration-700 delay-100"></div>

                <motion.span
                  className="text-primary text-3xl sm:text-4xl md:text-5xl font-bold relative z-10"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {String(index + 1).padStart(2, '0')}
                </motion.span>
              </div>
              <div className="p-4 sm:p-5 md:p-8">
                <p className="text-xs sm:text-sm text-apple-gray-500 dark:text-apple-gray-400 mb-1.5 md:mb-3 font-medium">{post.date}</p>
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1.5 md:mb-3 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-apple-gray-600 dark:text-apple-gray-300 mb-2 md:mb-4 line-clamp-2 sm:line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 mb-3 md:mb-5">
                  {post.categories.map((category, catIndex) => (
                    <Link
                      key={catIndex}
                      href={`/categories/${category.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-xs px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-300 text-xs sm:text-sm md:text-base py-1"
                  aria-label={`Read more about ${post.title}`}
                >
                  Read More
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Pagination */}
        <motion.div
          className="mt-10 sm:mt-12 md:mt-16 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button className="min-w-[90px] px-3 sm:px-4 py-2 border border-apple-gray-300 dark:border-apple-gray-700 rounded-full hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800 transition-colors text-sm sm:text-base">
              Previous
            </button>
            <button className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-dark transition-colors">
              1
            </button>
            <button className="w-10 h-10 flex items-center justify-center border border-apple-gray-300 dark:border-apple-gray-700 rounded-full hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800 transition-colors">
              2
            </button>
            <button className="min-w-[90px] px-3 sm:px-4 py-2 border border-apple-gray-300 dark:border-apple-gray-700 rounded-full hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800 transition-colors text-sm sm:text-base">
              Next
            </button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
