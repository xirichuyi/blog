import React from 'react';
import SideNavigation from './SideNavigation';
import Footer from './Footer';
import ScrollProgressBar from '../ui/ScrollProgressBar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  className = ""
}) => {
  return (
    <div className={`layout ${className}`}>
      {/* Global Scroll Progress Bar */}
      <ScrollProgressBar />

      <SideNavigation />

      <main className="layout-main">
        <div className="layout-content">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default Layout;
