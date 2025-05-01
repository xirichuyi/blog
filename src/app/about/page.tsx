"use client";

import { motion } from "framer-motion";
import PageTransition from "../../components/PageTransition";

export const metadata = {
  title: "About | Cyrus",
  description: "Learn more about Cyrus and his professional background",
};

export default function About() {
  return (
    <PageTransition>
      <div className="container-apple py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <motion.header
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-8">About Me</h1>
            <motion.div
              className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mx-auto flex items-center justify-center mb-8 relative overflow-hidden"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              {/* Inner highlight */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full"></div>

              <motion.span
                className="text-6xl font-bold text-primary relative z-10"
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
            </motion.div>
          </motion.header>

          <motion.section
            className="mb-16 card-apple p-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-primary">Professional Background</h2>
            <p className="text-lg mb-6">
              Hello, I&apos;m Cyrus, a business professional with over 10 years of experience in technology,
              strategy, and leadership. Throughout my career, I&apos;ve worked with Fortune 500 companies
              and innovative startups to drive digital transformation and business growth.
            </p>
            <p className="text-lg mb-6">
              My expertise spans across business strategy, digital innovation, and organizational leadership.
              I&apos;m passionate about helping businesses navigate the complexities of the modern business
              landscape and achieve sustainable success.
            </p>
            <p className="text-lg">
              I believe in a holistic approach to business that combines data-driven decision making with
              human-centered design and ethical leadership principles.
            </p>
          </motion.section>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-8 text-primary">Expertise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Business Strategy",
                  description: "Developing comprehensive business strategies that align with organizational goals and market dynamics."
                },
                {
                  title: "Digital Transformation",
                  description: "Guiding organizations through digital transformation initiatives to enhance efficiency and competitiveness."
                },
                {
                  title: "Leadership Development",
                  description: "Mentoring and developing leaders to build high-performing teams and foster innovation."
                },
                {
                  title: "Data Analytics",
                  description: "Leveraging data-driven insights to inform strategic decision-making and optimize business operations."
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="card-apple p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + (index * 0.1) }}
                  whileHover={{ y: -5 }}
                >
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p>{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-8 text-primary">Education & Certifications</h2>
            <div className="space-y-6">
              {[
                {
                  title: "MBA, Business Administration",
                  institution: "Harvard Business School"
                },
                {
                  title: "BS, Computer Science",
                  institution: "Massachusetts Institute of Technology"
                },
                {
                  title: "Certified Project Management Professional (PMP)",
                  institution: "Project Management Institute"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="card-apple p-8"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 + (index * 0.1) }}
                  whileHover={{ x: 5 }}
                >
                  <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                  <p className="text-apple-gray-600 dark:text-apple-gray-300">{item.institution}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="card-apple p-10 text-center"
          >
            <h2 className="text-2xl font-bold mb-6 text-primary">Contact</h2>
            <p className="text-lg mb-8">
              I&apos;m always open to discussing new opportunities, collaborations, or just connecting with like-minded professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="mailto:contact@cyrus.com"
                className="btn-apple btn-apple-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Email Me
              </motion.a>
              <motion.a
                href="#"
                className="btn-apple btn-apple-secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                LinkedIn Profile
              </motion.a>
            </div>
          </motion.section>
        </div>
      </div>
    </PageTransition>
  );
}
