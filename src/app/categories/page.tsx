"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../../components/PageTransition";

export default function Categories() {
  // 从博客文章中提取所有唯一分类
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

  // 提取所有唯一分类
  const allCategories = Array.from(
    new Set(
      blogPosts.flatMap(post => post.categories)
    )
  ).sort();

  // 计算每个分类下的文章数量
  const categoryCounts = allCategories.reduce((acc, category) => {
    acc[category] = blogPosts.filter(post => 
      post.categories.includes(category)
    ).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageTransition>
      <div className="container-apple py-16 md:py-24">
        <motion.header
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Categories</h1>
          <p className="text-xl text-apple-gray-600 dark:text-apple-gray-300 max-w-2xl mx-auto">
            Browse articles by topic to find exactly what you're looking for.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {allCategories.map((category, index) => (
            <motion.div
              key={category}
              className="card-apple group"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute w-32 h-32 rounded-full bg-white/20 -top-10 -right-10 group-hover:scale-125 transition-transform duration-700"></div>
                <div className="absolute w-24 h-24 rounded-full bg-primary/30 bottom-5 -left-10 group-hover:scale-110 transition-transform duration-700 delay-100"></div>

                <motion.span
                  className="text-primary text-4xl font-bold relative z-10"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {categoryCounts[category]}
                </motion.span>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">
                  {category}
                </h3>
                <p className="text-apple-gray-600 dark:text-apple-gray-300 mb-5">
                  {categoryCounts[category]} {categoryCounts[category] === 1 ? 'article' : 'articles'}
                </p>
                <Link 
                  href={`/categories/${category.toLowerCase().replace(/\s+/g, '-')}`} 
                  className="inline-flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-300"
                >
                  Browse Articles
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
