import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AdminSidebar() {
  const location = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: 'home',
      description: 'Overview & Analytics'
    },
    {
      name: 'Posts',
      path: '/admin/posts',
      icon: 'document-text',
      description: 'Manage Articles'
    },
    {
      name: 'Categories',
      path: '/admin/categories',
      icon: 'tag',
      description: 'Organize Content'
    },
    {
      name: 'Media',
      path: '/admin/media',
      icon: 'photo',
      description: 'Images & Files'
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: 'cog',
      description: 'System Config'
    },
  ];

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
      <nav className="mt-6 px-3">
        <ul className="space-y-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(`${item.path}/`));

            return (
              <motion.li
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link
                  to={item.path}
                  className={`admin-nav-item flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive ? 'active text-primary' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0">
                    {renderIcon(item.icon)}
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
      </nav>

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

function renderIcon(iconName: string) {
  const iconClass = "h-5 w-5";

  switch (iconName) {
    case 'home':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'document-text':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'tag':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
    case 'photo':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    case 'cog':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
}
