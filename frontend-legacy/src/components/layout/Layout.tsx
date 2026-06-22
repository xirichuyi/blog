import React from 'react';
import SideNavigation from './SideNavigation';
import Footer from './Footer';
import ScrollProgressBar from '../ui/ScrollProgressBar';
import SEOHead from '../seo/SEOHead';
import './Layout.css';

interface LayoutProps {
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
}

const Layout: React.FC<LayoutProps> = ({
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
  className = ""
}) => {
  return (
    <div className={`layout ${className}`}>
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
