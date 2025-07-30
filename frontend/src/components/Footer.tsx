import { motion } from "framer-motion";
import { SOCIAL_LINKS } from '@/constants';
import { fadeInUp, staggerContainer, staggerItem } from '@/utils/animations';

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 py-12">
      <div className="container-apple">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <motion.p
              className="text-gray-600 dark:text-gray-300"
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              © {new Date().getFullYear()} Cyrus. All rights reserved.
            </motion.p>
          </div>

          <motion.div
            className="flex gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {SOCIAL_LINKS.map((link) => (
              <motion.a
                key={link.label}
                href={link.href}
                className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                variants={staggerItem}
              >
                {link.label}
              </motion.a>
            ))}
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
