import React from 'react';
import MobileBottomNav from './MobileBottomNav';
import MobileTopBar from './MobileTopBar';
import ScrollProgressBar from '../ui/ScrollProgressBar';
import SEOHead from '../seo/SEOHead';
import './MobileLayout.css';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  category?: string;
  readingTime?: number;
  className?: string;
  showBottomNav?: boolean;
  showTopBar?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  description,
  keywords,
  image,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  tags,
  category,
  readingTime,
  className = "",
  showBottomNav = true,
  showTopBar = true
}) => {
  return (
    <div className={`mobile-layout ${className}`}>
      {/* SEO Head */}
      <SEOHead
        title={title}
        description={description}
        keywords={keywords}
        image={image}
        type={type}
        author={author}
        publishedTime={publishedTime}
        modifiedTime={modifiedTime}
        tags={tags}
        category={category}
        readingTime={readingTime}
      />

      {/* Global Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Top App Bar */}
      {showTopBar && <MobileTopBar title={title} />}

      {/* Main Content */}
      <main className={`mobile-layout-main ${showBottomNav ? 'with-bottom-nav' : ''} ${showTopBar ? 'with-top-bar' : ''}`}>
        <div className="mobile-layout-content">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
};

export default MobileLayout;

