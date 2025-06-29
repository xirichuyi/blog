"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function AdminHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-apple-gray-800 shadow-sm border-b border-apple-gray-700">
      <div className="flex justify-between items-center p-4 max-w-7xl mx-auto">
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-apple-gray-300 hover:text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-primary ml-4 md:hidden">Blog Admin</h1>
        </div>

        {/* 删除多余的按钮，保持简洁的界面 */}
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <nav className="bg-apple-gray-800 shadow-md p-4 md:hidden border-t border-apple-gray-700">
          <ul className="space-y-2">
            <li>
              <Link
                href="/admin"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-300 hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/admin/posts"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-300 hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Posts
              </Link>
            </li>
            <li>
              <Link
                href="/admin/categories"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-300 hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
            </li>
            <li>
              <Link
                href="/admin/ai-assistant"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-300 hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                AI Assistant
              </Link>
            </li>
            <li>
              <Link
                href="/admin/settings"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-300 hover:bg-apple-gray-700 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Settings
              </Link>
            </li>
            <li className="border-t border-apple-gray-700 pt-2 mt-2">
              <Link
                href="/"
                className="block px-4 py-2 text-sm font-medium text-apple-gray-300 hover:bg-apple-gray-700 rounded"
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
