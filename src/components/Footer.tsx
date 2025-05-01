"use client";

import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="bg-apple-gray-100 dark:bg-apple-gray-800 py-12">
      <div className="container-apple">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <motion.p
              className="text-apple-gray-600 dark:text-apple-gray-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              © {new Date().getFullYear()} Cyrus. All rights reserved.
            </motion.p>
          </div>

          <div className="flex gap-6">
            {[
              { href: "#", label: "LinkedIn", delay: 0.1 },
              { href: "#", label: "Twitter", delay: 0.2 },
              { href: "#", label: "GitHub", delay: 0.3 },
            ].map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                className="text-apple-gray-600 dark:text-apple-gray-300 hover:text-primary"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: link.delay }}
              >
                {link.label}
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
