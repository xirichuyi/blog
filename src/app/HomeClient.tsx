"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { Post } from "@/lib/blog-server";

interface HomeClientProps {
  latestPosts: Post[];
}

export default function HomeClient({ latestPosts }: HomeClientProps) {
  return (
    <PageTransition>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white to-apple-gray-100 dark:from-black dark:to-apple-gray-900"></div>

        {/* Background circles - Apple style decorative elements */}
        <motion.div
          className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-primary/5"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        ></motion.div>
        <motion.div
          className="absolute bottom-20 left-[5%] w-96 h-96 rounded-full bg-primary/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
        ></motion.div>

        <div className="container-apple relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                suppressHydrationWarning={true}
              >
                Welcome to <span className="text-primary">Cyrus&apos;s</span> Blog
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl text-apple-gray-600 dark:text-apple-gray-300 mb-10 font-light"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                suppressHydrationWarning={true}
              >
                Professional insights and expertise on business, technology, and innovation.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              >
                <Link href="/blog" className="btn-apple btn-apple-primary">
                  Read Articles
                </Link>
                <Link href="/about" className="btn-apple btn-apple-secondary">
                  About Me
                </Link>
              </motion.div>
            </div>

            <div className="md:w-1/2 flex justify-center">
              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 1,
                  delay: 0.3,
                  ease: [0.175, 0.885, 0.32, 1] // Apple-style cubic bezier
                }}
              >
                {/* Main logo circle with 3D effect */}
                <div className="w-72 h-72 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-apple relative overflow-hidden backdrop-blur-apple">
                  {/* Inner highlight */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full"></div>

                  {/* Logo text */}
                  <motion.span
                    className="text-7xl font-bold text-primary relative z-10"
                    animate={{
                      y: [0, -5, 0],
                      rotateZ: [0, 2, 0]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    C
                  </motion.span>
                </div>

                {/* Floating elements around the logo */}
                <motion.div
                  className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-primary/30"
                  animate={{
                    y: [0, -10, 0],
                    x: [0, 5, 0]
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                ></motion.div>

                <motion.div
                  className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-primary/20"
                  animate={{
                    y: [0, 10, 0],
                    x: [0, -5, 0]
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                ></motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Posts Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-apple-gray-300 dark:via-apple-gray-700 to-transparent"></div>
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-apple-gray-300 dark:via-apple-gray-700 to-transparent"></div>

        <div className="container-apple">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Latest Articles</h2>
            <p className="text-apple-gray-600 dark:text-apple-gray-300 max-w-2xl mx-auto text-lg">
              Explore the latest insights on business strategy, leadership, and innovation.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {latestPosts.length > 0 ? (
              latestPosts.map((post, index) => (
                <motion.div
                  key={post.slug}
                  className="card-apple group"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, delay: index * 0.1 }}
                >
                  <div className="h-52 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center relative overflow-hidden">
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
                    <p className="text-sm text-apple-gray-500 dark:text-apple-gray-400 mb-3 font-medium">
                      {new Date(post.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">
                      {post.title}
                    </h3>
                    <p className="text-apple-gray-600 dark:text-apple-gray-300 mb-5">
                      {post.excerpt}
                    </p>
                    <Link 
                      href={`/blog/${post.slug}`} 
                      className="inline-flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-300"
                    >
                      Read More
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-apple-gray-500 dark:text-apple-gray-400 text-lg">
                  No articles published yet. Check back soon!
                </p>
              </div>
            )}
          </div>

          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Link href="/blog" className="btn-apple btn-apple-secondary inline-flex items-center">
              View All Articles
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Background with Apple-style gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5"></div>

        {/* Decorative elements */}
        <motion.div
          className="absolute top-20 left-[5%] w-72 h-72 rounded-full bg-primary/10"
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        ></motion.div>
        <motion.div
          className="absolute bottom-20 right-[5%] w-96 h-96 rounded-full bg-primary/5"
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
        ></motion.div>

        <div className="container-apple relative z-10">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="card-apple p-10 md:p-12 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Stay Updated</h2>
                <p className="text-lg text-apple-gray-600 dark:text-apple-gray-300 mb-8">
                  Subscribe to receive the latest insights and articles delivered directly to your inbox.
                </p>
              </motion.div>

              <motion.form
                className="flex flex-col gap-4 max-w-lg mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="input-apple w-full px-6 py-4 rounded-full text-base"
                    required
                  />
                </div>

                <motion.button
                  type="submit"
                  className="btn-apple btn-apple-primary py-4"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  Subscribe
                </motion.button>
              </motion.form>

              <motion.p
                className="text-sm text-apple-gray-500 dark:text-apple-gray-400 mt-6"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                By subscribing, you agree to our Privacy Policy and consent to receive updates from us.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
