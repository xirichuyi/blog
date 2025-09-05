import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  type?: 'article' | 'card' | 'text' | 'avatar' | 'image';
  count?: number;
  height?: string;
  width?: string;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'text',
  count = 1,
  height = '20px',
  width = '100%',
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'article':
        return (
          <div className={`skeleton-article ${className}`}>
            <div className="skeleton-image" style={{ height: '200px', width: '100%' }} />
            <div className="skeleton-content">
              <div className="skeleton-line" style={{ height: '24px', width: '80%', marginBottom: '12px' }} />
              <div className="skeleton-line" style={{ height: '16px', width: '100%', marginBottom: '8px' }} />
              <div className="skeleton-line" style={{ height: '16px', width: '90%', marginBottom: '8px' }} />
              <div className="skeleton-line" style={{ height: '16px', width: '60%' }} />
            </div>
          </div>
        );
      
      case 'card':
        return (
          <div className={`skeleton-card ${className}`}>
            <div className="skeleton-line" style={{ height: '20px', width: '70%', marginBottom: '12px' }} />
            <div className="skeleton-line" style={{ height: '16px', width: '100%', marginBottom: '8px' }} />
            <div className="skeleton-line" style={{ height: '16px', width: '80%' }} />
          </div>
        );
      
      case 'avatar':
        return (
          <div 
            className={`skeleton-avatar ${className}`}
            style={{ 
              height: height, 
              width: height, 
              borderRadius: '50%' 
            }} 
          />
        );
      
      case 'image':
        return (
          <div 
            className={`skeleton-image ${className}`}
            style={{ height, width }} 
          />
        );
      
      default:
        return (
          <div 
            className={`skeleton-line ${className}`}
            style={{ height, width }} 
          />
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-wrapper">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;
