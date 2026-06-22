import { useEffect } from 'react';

interface ResourcePreloaderProps {
  resources?: string[];
  fonts?: string[];
  criticalCSS?: string[];
}

const ResourcePreloader: React.FC<ResourcePreloaderProps> = ({
  resources = [],
  fonts = [],
  criticalCSS = []
}) => {
  useEffect(() => {
    // Preload critical resources
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      // Determine resource type based on file extension
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(jpg|jpeg|png|webp|avif)$/)) {
        link.as = 'image';
      } else if (resource.match(/\.(woff|woff2|ttf|otf)$/)) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
    });

    // Preload fonts
    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Preload critical CSS
    criticalCSS.forEach(css => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = css;
      link.as = 'style';
      document.head.appendChild(link);
    });

    // DNS prefetch for external domains
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'api.github.com'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });

    // Preconnect to critical external resources
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

  }, [resources, fonts, criticalCSS]);

  return null; // This component doesn't render anything
};

export default ResourcePreloader;
