"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function AdminHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-apple-gray-800 shadow-sm">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-apple-gray-600 dark:text-apple-gray-300 hover:text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-primary ml-4 md:hidden">Blog Admin</h1>
        </div>
        
        <div className="flex items-center ml-auto">
          <Link
            href="/admin/posts/new"
            className="btn-apple btn-apple-primary text-sm mr-4"
          >
            New Post
          </Link>
          
          <div className="relative">
            <button
              className="flex items-center text-sm font-medium text-apple-gray-600 dark:text-apple-gray-300 hover:text-primary"
              onClick={() => {/* Toggle user menu */}}
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold mr-2">
                A
              </div>
              <span className="hidden md:inline">Admin</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <nav className="bg-white dark:bg-apple-gray-800 shadow-md p-4 md:hidden">
          <ul className="space-y-2">
            <li>
              <Link
                href="/admin"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/admin/posts"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Posts
              </Link>
            </li>
            <li>
              <Link
                href="/admin/categories"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
            </li>
            <li>
              <Link
                href="/admin/ai-assistant"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                AI Assistant
              </Link>
            </li>
            <li>
              <Link
                href="/admin/settings"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Settings
              </Link>
            </li>
            <li className="border-t border-apple-gray-200 dark:border-apple-gray-700 pt-2 mt-2">
              <Link
                href="/"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Back to Blog
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
