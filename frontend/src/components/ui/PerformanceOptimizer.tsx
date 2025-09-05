import { useEffect } from 'react';

const PerformanceOptimizer: React.FC = () => {
  useEffect(() => {
    // 紧急性能优化措施
    const optimizePerformance = () => {
      // 1. 预加载关键资源
      const preloadCriticalResources = () => {
        const criticalResources = [
          { href: '/src/styles/theme.css', as: 'style' },
          { href: '/src/styles/global.css', as: 'style' },
          { href: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2', as: 'font', type: 'font/woff2' }
        ];

        criticalResources.forEach(resource => {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.href = resource.href;
          link.as = resource.as;
          if (resource.type) link.type = resource.type;
          if (resource.as === 'font') link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        });
      };

      // 2. 优化图片加载
      const optimizeImages = () => {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (!img.loading) {
            img.loading = 'lazy';
          }
          if (!img.decoding) {
            img.decoding = 'async';
          }
        });
      };

      // 3. 减少重排和重绘
      const optimizeLayout = () => {
        // 批量DOM操作
        document.documentElement.style.setProperty('--optimize-rendering', 'true');
        
        // 启用硬件加速
        const criticalElements = document.querySelectorAll('.article-card, .search-results, .navigation');
        criticalElements.forEach(el => {
          (el as HTMLElement).style.transform = 'translateZ(0)';
          (el as HTMLElement).style.willChange = 'transform';
        });
      };

      // 4. 预连接到外部域名
      const preconnectDomains = () => {
        const domains = [
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
          'http://172.245.148.234:3007' // API域名
        ];

        domains.forEach(domain => {
          const link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = domain;
          if (domain.includes('fonts')) {
            link.crossOrigin = 'anonymous';
          }
          document.head.appendChild(link);
        });
      };

      // 5. 优化关键渲染路径
      const optimizeCriticalPath = () => {
        // 内联关键CSS
        const criticalCSS = `
          body { 
            font-family: 'Roboto', sans-serif; 
            margin: 0; 
            padding: 0;
            background-color: var(--md-sys-color-background);
          }
          .loading-skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
          }
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .article-card {
            transform: translateZ(0);
            will-change: transform;
          }
        `;

        const style = document.createElement('style');
        style.textContent = criticalCSS;
        document.head.appendChild(style);
      };

      // 执行所有优化
      preloadCriticalResources();
      preconnectDomains();
      optimizeCriticalPath();
      
      // 延迟执行非关键优化
      setTimeout(() => {
        optimizeImages();
        optimizeLayout();
      }, 100);
    };

    // 立即执行优化
    optimizePerformance();

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时，执行额外优化
        requestIdleCallback(() => {
          // 清理未使用的资源
          const unusedLinks = document.querySelectorAll('link[rel="preload"]:not([data-used])');
          unusedLinks.forEach(link => {
            setTimeout(() => link.remove(), 5000);
          });
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
};

export default PerformanceOptimizer;
