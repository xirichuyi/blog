import { motion } from 'framer-motion';

export default function About() {
  return (
    <div className="min-h-screen bg-black text-white py-20">
      <div className="container-apple max-w-4xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Cyrus</h1>
          <p className="text-xl text-apple-gray-300">
            Passionate developer and technology enthusiast
          </p>
        </motion.div>

        <motion.div
          className="prose prose-lg prose-invert max-w-none"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="card-apple p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Background</h2>
            <p className="text-apple-gray-300 leading-relaxed mb-4">
              I'm an undergraduate student at Southwest University of Science and Technology with a passion for coding and technology. 
              My journey in the tech world spans multiple domains, from web development to artificial intelligence.
            </p>
          </div>

          <div className="card-apple p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Expertise</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Development</h3>
                <ul className="text-apple-gray-300 space-y-1">
                  <li>• Web Development</li>
                  <li>• Golang Programming</li>
                  <li>• Game Development</li>
                  <li>• VSCode Plugin Development</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Technology & Finance</h3>
                <ul className="text-apple-gray-300 space-y-1">
                  <li>• Machine Learning</li>
                  <li>• AI Development</li>
                  <li>• Quantitative Trading</li>
                  <li>• Financial Knowledge</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card-apple p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Interests</h2>
            <p className="text-apple-gray-300 leading-relaxed mb-4">
              Beyond coding, I'm deeply interested in cybersecurity basics, web scraping techniques, and the intersection of 
              technology with finance. I enjoy exploring new technologies and sharing my insights through this blog.
            </p>
          </div>

          <div className="card-apple p-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Connect</h2>
            <p className="text-apple-gray-300 leading-relaxed mb-4">
              Feel free to reach out if you'd like to discuss technology, collaborate on projects, or just have a chat about 
              the latest developments in the tech world.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-primary hover:text-primary-light transition-colors">
                GitHub
              </a>
              <a href="#" className="text-primary hover:text-primary-light transition-colors">
                LinkedIn
              </a>
              <a href="#" className="text-primary hover:text-primary-light transition-colors">
                Twitter
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
