"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../../../components/PageTransition";

import { BlogPost } from '@/lib/blog-types';

interface BlogPostClientProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export default function BlogPostClient({ post, relatedPosts }: BlogPostClientProps) {
  return (
    <PageTransition>
      <article className="container-apple py-8 sm:py-12 md:py-24">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center text-apple-gray-600 dark:text-apple-gray-300 hover:text-primary mb-6 md:mb-8"
            aria-label="Return to blog listing"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm sm:text-base">Back to Blog</span>
          </Link>

          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-8 md:mb-12"
          >
            <p className="text-sm sm:text-base text-primary font-medium mb-3 md:mb-4">{post.date}</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">{post.title}</h1>
            <p className="text-base sm:text-lg md:text-xl text-apple-gray-600 dark:text-apple-gray-300 mb-4 md:mb-6">{post.excerpt}</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {post.categories.map((category, index) => (
                <Link
                  key={index}
                  href={`/categories/${category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-xs sm:text-sm px-3 sm:px-4 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          </motion.header>

          <motion.div
            className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none prose-headings:text-apple-gray-900 dark:prose-headings:text-white prose-p:text-apple-gray-700 dark:prose-p:text-apple-gray-200 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 sm:mt-12 md:mt-16 pt-6 sm:pt-8 border-t border-apple-gray-200 dark:border-apple-gray-700"
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Share this article</h2>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-apple btn-apple-secondary text-sm sm:text-base px-4 sm:px-6 py-2"
                aria-label="Share on Twitter"
              >
                Twitter
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-apple btn-apple-secondary text-sm sm:text-base px-4 sm:px-6 py-2"
                aria-label="Share on LinkedIn"
              >
                LinkedIn
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-apple btn-apple-secondary text-sm sm:text-base px-4 sm:px-6 py-2"
                aria-label="Share on Facebook"
              >
                Facebook
              </a>
            </div>
          </motion.div>

          {/* 相关文章推荐 */}
          {relatedPosts.length > 0 && (
            <motion.div
              className="mt-10 sm:mt-12 md:mt-16 pt-6 sm:pt-8 border-t border-apple-gray-200 dark:border-apple-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Related Articles</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/blog/${relatedPost.slug}`}
                    className="card-apple group p-4 sm:p-6 block hover:no-underline"
                  >
                    <p className="text-xs sm:text-sm text-apple-gray-500 dark:text-apple-gray-400 mb-1.5 sm:mb-2 font-medium">{relatedPost.date}</p>
                    <h3 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                      {relatedPost.categories
                        .filter(category => post.categories.includes(category))
                        .map((category, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 text-primary rounded-full"
                          >
                            {category}
                          </span>
                        ))
                      }
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </article>
    </PageTransition>
  );
}
