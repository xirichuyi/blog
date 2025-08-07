import React, { useState, useEffect } from 'react';
import './ScrollProgressBar.css';

interface ScrollProgressBarProps {
  className?: string;
  minVisibleProgress?: number; // 最小可见进度百分比，默认5%
}

const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  className = '',
  minVisibleProgress = 5
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll progress based on entire page
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;

      // Calculate the maximum scrollable distance (total height - window height)
      const maxScroll = documentHeight - windowHeight;

      // Calculate progress percentage
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial call to set progress
    handleScroll();

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`wave-progress-container ${scrollProgress > minVisibleProgress ? 'visible' : ''} ${className}`}
      style={{ width: `${scrollProgress}%` }}
    >
      <svg className="wave-progress" viewBox="0 0 160 10" preserveAspectRatio="none">
        {/* Background wavy track */}
        <path
          className="wave-background"
          d="M0,5 q2.5,3,5,0 t5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Progress wavy indicator */}
        <path
          className="wave-path"
          d="M0,5 q2.5,3,5,0 t5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0 5,0"
          fill="none"
          stroke="var(--md-sys-color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(var(--md-sys-color-primary-rgb), 0.5))'
          }}
        />
      </svg>
    </div>
  );
};

export default ScrollProgressBar;
