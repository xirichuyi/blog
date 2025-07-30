import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useIsMobile } from '@/hooks';
import { PUBLIC_NAV_ITEMS } from '@/constants';
import { navVariants, mobileMenuVariants } from '@/utils/animations';
import { Button, Icon } from '@/components/ui';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // 当屏幕尺寸变化时，如果不再是移动设备，关闭移动菜单
  if (!isMobile && isMobileMenuOpen) {
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="navbar-apple">
      <div className="container-apple py-4">
        <nav className="flex justify-between items-center">
          <motion.div
            variants={navVariants}
            initial="initial"
            animate="animate"
          >
            <Link to="/" className="text-2xl font-bold text-primary">
              Cyrus
            </Link>
          </motion.div>

          {/* 桌面导航 */}
          <div className="flex items-center">
            <div className="hidden md:flex gap-8 mr-4">
              {PUBLIC_NAV_ITEMS.map((link) => (
                <motion.div
                  key={link.href}
                  variants={navVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: link.delay }}
                >
                  <Link
                    to={link.href}
                    className="hover:text-primary relative group"
                  >
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </motion.div>
              ))}
            </div>



            {/* 移动端汉堡菜单按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden ml-2 w-10 h-10 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              animated
            >
              <Icon name={isMobileMenuOpen ? "close" : "menu"} size="md" />
            </Button>
          </div>
        </nav>
      </div>

      {/* 移动端导航菜单 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden mobile-menu-container bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-700"
            variants={mobileMenuVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="container-apple py-4">
              <div className="flex flex-col space-y-4">
                {PUBLIC_NAV_ITEMS.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      to={link.href}
                      className="block py-2 text-gray-900 dark:text-white font-medium hover:text-primary transition-colors text-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </header>
  );
}
