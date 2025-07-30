import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ADMIN_NAV_ITEMS } from '@/constants';
import { staggerContainer, staggerItem } from '@/utils/animations';
import { Icon } from '@/components/ui';

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed w-64 lg:w-72 admin-sidebar shadow-2xl hidden md:block h-full z-50">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-xl font-bold text-primary mb-1">Cyrus Admin</h1>
          <p className="text-xs text-gray-400">Content Management</p>
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.nav
        className="mt-6 px-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <ul className="space-y-2">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(`${item.path}/`));

            return (
              <motion.li
                key={item.path}
                variants={staggerItem}
              >
                <Link
                  to={item.path}
                  className={`admin-nav-item flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive ? 'active text-primary' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0">
                    <Icon name={item.icon} size="md" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                  </div>
                  {isActive && (
                    <motion.div
                      className="w-2 h-2 bg-primary rounded-full ml-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </motion.nav>

      {/* User Info & Actions */}
      <div className="absolute bottom-0 w-full p-4 border-t border-white/10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="space-y-3"
        >
          {/* User Profile */}
          <div className="flex items-center p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">Cyrus</div>
              <div className="text-xs text-gray-400">Administrator</div>
            </div>
          </div>

          {/* Back to Blog */}
          <Link
            to="/"
            className="flex items-center p-2 text-sm font-medium text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-white/5"
          >
            <span className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </span>
            Back to Blog
          </Link>
        </motion.div>
      </div>
    </aside>
  );
}


