import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import Layout from './Layout';
import MobileLayout from './MobileLayout';

interface ResponsiveLayoutProps {
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

/**
 * 响应式布局包装器
 * 自动根据设备类型选择合适的布局组件
 */
const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = (props) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout {...props} />;
  }

  return <Layout {...props} />;
};

export default ResponsiveLayout;

