"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Header() {
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

          <div className="flex gap-8">
            {[
              { href: "/", label: "Home", delay: 0.1 },
              { href: "/blog", label: "Blog", delay: 0.2 },
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
        </nav>
      </div>
    </header>
  );
}
