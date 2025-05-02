"use client";

import { motion } from "framer-motion";
import PageTransition from "../../components/PageTransition";

export default function AboutClient() {
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
              Hello, I&apos;m Cyrus, a passionate coder and technology enthusiast with an insatiable curiosity for learning new skills.
              I pride myself on my exceptional learning ability, having mastered numerous technologies and programming paradigms in a relatively short time.
            </p>
            <p className="text-lg mb-6">
              My technical journey spans across machine learning algorithms (ML, CNN, DL), game development, web3 technologies, and cybersecurity.
              I&apos;m constantly exploring new technological frontiers and applying my knowledge to create innovative solutions.
            </p>
            <p className="text-lg">
              I believe in a hands-on approach to technology that combines theoretical understanding with practical implementation,
              always seeking to expand my skillset and tackle challenging problems.
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
                  title: "Machine Learning",
                  description: "Experience with ML, CNN, DL algorithms and frameworks, applying theoretical concepts to practical applications."
                },
                {
                  title: "Golang Programming",
                  description: "Proficient in Golang for developing automation scripts, backend services, and integrating with AI APIs for intelligent solutions."
                },
                {
                  title: "Web3 & Blockchain",
                  description: "Building web scrapers for Web3 platforms to gather data for personal projects and networking with project teams."
                },
                {
                  title: "Cybersecurity",
                  description: "Knowledge of security concepts including SQL injection, XSS attacks, lateral movement, file upload vulnerabilities, and password cracking."
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
                  title: "Undergraduate Student",
                  institution: "Southwest University of Science and Technology"
                },
                {
                  title: "Self-taught Developer",
                  institution: "Various Online Platforms & Personal Projects"
                },
                {
                  title: "Game Development Enthusiast",
                  institution: "Independent Learning & Experimentation"
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
              I&apos;m always eager to collaborate on interesting technical projects, discuss new technologies, or connect with fellow developers and tech enthusiasts.
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
