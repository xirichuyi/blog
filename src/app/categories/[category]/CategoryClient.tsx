"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../../../components/PageTransition";
import { BlogPost } from "@/lib/blog-types";

interface CategoryClientProps {
  categoryName: string;
  posts: BlogPost[];
}

export default function CategoryClient({ categoryName, posts }: CategoryClientProps) {
  return (
    <PageTransition>
      <div className="container-apple py-16 md:py-24">
        <motion.header
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Link
            href="/categories"
            className="inline-flex items-center text-apple-gray-600 dark:text-apple-gray-300 hover:text-primary mb-8"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Categories
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{categoryName}</h1>
          <p className="text-xl text-apple-gray-600 dark:text-apple-gray-300 max-w-2xl mx-auto">
            {posts.length} {posts.length === 1 ? 'article' : 'articles'} in this category
          </p>
        </motion.header>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              className="card-apple group"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute w-32 h-32 rounded-full bg-white/20 -top-10 -right-10 group-hover:scale-125 transition-transform duration-700"></div>
                <div className="absolute w-24 h-24 rounded-full bg-primary/30 bottom-5 -left-10 group-hover:scale-110 transition-transform duration-700 delay-100"></div>

                <motion.span
                  className="text-primary text-5xl font-bold relative z-10"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {String(index + 1).padStart(2, '0')}
                </motion.span>
              </div>
              <div className="p-8">
                <p className="text-sm text-apple-gray-500 dark:text-apple-gray-400 mb-3 font-medium">{post.date}</p>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">
                  {post.title}
                </h3>
                <p className="text-apple-gray-600 dark:text-apple-gray-300 mb-4">
                  {post.excerpt}
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {post.categories.map((category, catIndex) => (
                    <Link 
                      key={catIndex} 
                      href={`/categories/${category.toLowerCase().replace(/\s+/g, '-')}`}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        category === categoryName 
                          ? "bg-primary text-white" 
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {category}
                    </Link>
                  ))}
                </div>
                <Link href={`/blog/${post.slug}`} className="inline-flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-300">
                  Read More
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
