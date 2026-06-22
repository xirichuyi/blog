import React, { Suspense, lazy } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import LoadingSpinner from '../ui/LoadingSpinner';

// Desktop components
const Home = lazy(() => import('../../pages/Home'));
const Articles = lazy(() => import('../../pages/Articles'));
const ArticleDetail = lazy(() => import('../../pages/Articles/components/ArticleDetail'));
const About = lazy(() => import('../../pages/About'));
const Contact = lazy(() => import('../../pages/Contact'));

// Mobile components
const MobileHome = lazy(() => import('../../pages/Home/MobileHome'));
const MobileArticles = lazy(() => import('../../pages/Articles/MobileArticles'));
const MobileArticleDetail = lazy(() => import('../../pages/Articles/components/MobileArticleDetail'));
const MobileAbout = lazy(() => import('../../pages/About/MobileAbout'));
const MobileContact = lazy(() => import('../../pages/Contact/MobileContact'));

interface ResponsiveRouteProps {
  page: 'home' | 'articles' | 'article-detail' | 'about' | 'contact';
  [key: string]: any;
}

/**
 * 响应式路由组件
 * 根据设备类型自动选择合适的页面组件
 */
const ResponsiveRoute: React.FC<ResponsiveRouteProps> = ({ page, ...props }) => {
  const isMobile = useIsMobile();

  const getComponent = () => {
    if (isMobile) {
      switch (page) {
        case 'home':
          return <MobileHome {...props} />;
        case 'articles':
          return <MobileArticles {...props} />;
        case 'article-detail':
          return <MobileArticleDetail {...props} />;
        case 'about':
          return <MobileAbout {...props} />;
        case 'contact':
          return <MobileContact {...props} />;
        default:
          return <MobileHome {...props} />;
      }
    } else {
      switch (page) {
        case 'home':
          return <Home {...props} />;
        case 'articles':
          return <Articles {...props} />;
        case 'article-detail':
          return <ArticleDetail {...props} />;
        case 'about':
          return <About {...props} />;
        case 'contact':
          return <Contact {...props} />;
        default:
          return <Home {...props} />;
      }
    }
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {getComponent()}
    </Suspense>
  );
};

export default ResponsiveRoute;

