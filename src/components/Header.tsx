"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import SearchModal from "./SearchModal";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  return (
    <header className="navbar-apple">
      <div className="container-apple py-4">
        <nav className="flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="text-2xl font-bold text-primary">
              Cyrus
            </Link>
          </motion.div>

          <div className="flex items-center">
            <div className="flex gap-8 mr-4">
              {[
                { href: "/", label: "Home", delay: 0.1 },
                { href: "/blog", label: "Blog", delay: 0.2 },
                { href: "/categories", label: "Categories", delay: 0.25 },
                { href: "/about", label: "About", delay: 0.3 },
              ].map((link) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: link.delay }}
                >
                  <Link
                    href={link.href}
                    className="hover:text-primary relative group"
                  >
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* 主题切换按钮 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mr-2"
            >
              <ThemeToggle />
            </motion.div>

            {/* 搜索按钮 */}
            <motion.button
              onClick={toggleSearch}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-200 dark:hover:bg-apple-gray-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              aria-label="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </motion.button>
          </div>
        </nav>
      </div>

      {/* 搜索模态框 */}
      <SearchModal isOpen={isSearchOpen} onClose={toggleSearch} />
    </header>
  );
}
