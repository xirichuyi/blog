"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../../../components/PageTransition";
import { notFound } from "next/navigation";

export default function CategoryPage({ params }: { params: { category: string } }) {
  // 解码URL参数
  const categorySlug = params.category;
  
  // 博客文章数据
  const blogPosts = [
    {
      id: 1,
      title: "Business Strategy in the Digital Age",
      excerpt: "Exploring how digital transformation is reshaping business strategies across industries.",
      date: "May 2, 2024",
      slug: "business-strategy-digital-age",
      categories: ["Strategy", "Digital Transformation"],
    },
    {
      id: 2,
      title: "Leadership Principles for Modern Teams",
      excerpt: "Key leadership principles that drive success in today's fast-paced business environment.",
      date: "April 28, 2024",
      slug: "leadership-principles-modern-teams",
      categories: ["Leadership", "Team Management"],
    },
    {
      id: 3,
      title: "The Future of Work: Trends and Predictions",
      excerpt: "Analyzing emerging workplace trends and what they mean for businesses and professionals.",
      date: "April 15, 2024",
      slug: "future-work-trends-predictions",
      categories: ["Future of Work", "Workplace Trends"],
    },
    {
      id: 4,
      title: "Effective Communication in Remote Teams",
      excerpt: "Strategies for maintaining clear and effective communication in distributed teams.",
      date: "April 5, 2024",
      slug: "effective-communication-remote-teams",
      categories: ["Communication", "Remote Work"],
    },
    {
      id: 5,
      title: "Data-Driven Decision Making",
      excerpt: "How to leverage data analytics to make more informed business decisions.",
      date: "March 22, 2024",
      slug: "data-driven-decision-making",
      categories: ["Data Analytics", "Decision Making"],
    },
    {
      id: 6,
      title: "Building a Strong Company Culture",
      excerpt: "The importance of company culture and how to cultivate it effectively.",
      date: "March 10, 2024",
      slug: "building-strong-company-culture",
      categories: ["Company Culture", "Leadership"],
    },
  ];

  // 查找匹配的分类
  const matchingCategory = Array.from(
    new Set(blogPosts.flatMap(post => post.categories))
  ).find(category => 
    category.toLowerCase().replace(/\s+/g, '-') === categorySlug
  );

  // 如果找不到匹配的分类，返回404
  if (!matchingCategory) {
    notFound();
  }

  // 筛选该分类下的文章
  const filteredPosts = blogPosts.filter(post => 
    post.categories.includes(matchingCategory)
  );

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
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{matchingCategory}</h1>
          <p className="text-xl text-apple-gray-600 dark:text-apple-gray-300 max-w-2xl mx-auto">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'} in this category
          </p>
        </motion.header>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {filteredPosts.map((post, index) => (
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
                        category === matchingCategory 
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
