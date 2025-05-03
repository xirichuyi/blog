"use client";

import { useSearchParams } from 'next/navigation';
import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../../components/PageTransition";
import { BlogPost } from "@/lib/blog-types";

interface SearchClientProps {
  searchResults: BlogPost[];
}

export default function SearchClient({ searchResults }: SearchClientProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <PageTransition>
      <div className="container-apple py-16 md:py-24">
        <motion.header
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">搜索结果</h1>
          <p className="text-xl text-apple-gray-300 max-w-2xl mx-auto">
            {searchResults.length} 篇文章匹配 &quot;{query}&quot;
          </p>
        </motion.header>

        {searchResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {searchResults.map((post, index) => (
              <motion.article
                key={post.id}
                className="card-apple group"
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
                  <p className="text-xs sm:text-sm text-apple-gray-400 mb-1.5 md:mb-3 font-medium">{post.date}</p>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1.5 md:mb-3 text-white group-hover:text-primary transition-colors duration-300 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-apple-gray-300 mb-2 md:mb-4 line-clamp-2 sm:line-clamp-3">
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
        ) : (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <p className="text-xl text-apple-gray-300 mb-8">
              没有找到匹配的文章
            </p>
            <Link href="/blog" className="btn-apple btn-apple-primary">
              浏览所有文章
            </Link>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
