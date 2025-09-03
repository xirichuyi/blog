import React, { useState, useEffect, useRef } from 'react';
import './ReadingProgress.css';

interface ReadingProgressProps {
  target?: string; // CSS selector for the content to track
  showPercentage?: boolean;
  showTimeEstimate?: boolean;
  className?: string;
}

interface ReadingStats {
  progress: number; // 0-100
  timeRemaining: number; // in minutes
  wordsRead: number;
  totalWords: number;
}

const ReadingProgress: React.FC<ReadingProgressProps> = ({
  target = '.article-content',
  showPercentage = true,
  showTimeEstimate = true,
  className = ''
}) => {
  const [stats, setStats] = useState<ReadingStats>({
    progress: 0,
    timeRemaining: 0,
    wordsRead: 0,
    totalWords: 0
  });
  const [isVisible, setIsVisible] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetElement = document.querySelector(target);
    if (!targetElement) return;

    // Calculate total words
    const text = targetElement.textContent || '';
    const totalWords = text.trim().split(/\s+/).length;
    const averageReadingSpeed = 200; // words per minute

    const updateProgress = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Get target element position
      const targetRect = targetElement.getBoundingClientRect();
      const targetTop = targetRect.top + scrollTop;
      const targetHeight = targetRect.height;
      
      // Calculate progress based on target element
      let progress = 0;
      if (scrollTop > targetTop) {
        const scrolledInTarget = Math.min(scrollTop - targetTop, targetHeight);
        progress = (scrolledInTarget / targetHeight) * 100;
      }
      
      progress = Math.max(0, Math.min(100, progress));
      
      // Calculate reading stats
      const wordsRead = Math.floor((progress / 100) * totalWords);
      const wordsRemaining = totalWords - wordsRead;
      const timeRemaining = Math.ceil(wordsRemaining / averageReadingSpeed);
      
      setStats({
        progress,
        timeRemaining: Math.max(0, timeRemaining),
        wordsRead,
        totalWords
      });

      // Show/hide based on scroll position
      setIsVisible(scrollTop > 100);
    };

    // Initial calculation
    updateProgress();

    // Throttled scroll handler
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateProgress);
    };
  }, [target]);

  const handleProgressClick = (e: React.MouseEvent) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    // Find target element and scroll to corresponding position
    const targetElement = document.querySelector(target);
    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const targetTop = targetRect.top + window.pageYOffset;
      const targetHeight = targetRect.height;
      const scrollTo = targetTop + (targetHeight * percentage / 100);
      
      window.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`reading-progress ${isVisible ? 'visible' : ''} ${className}`}>
      {/* Progress Bar */}
      <div 
        ref={progressRef}
        className="reading-progress-bar"
        onClick={handleProgressClick}
        role="progressbar"
        aria-valuenow={stats.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Reading progress: ${Math.round(stats.progress)}%`}
      >
        <div 
          className="reading-progress-fill"
          style={{ width: `${stats.progress}%` }}
        />
        <div className="reading-progress-thumb" style={{ left: `${stats.progress}%` }} />
      </div>

      {/* Stats Display */}
      <div className="reading-progress-stats">
        {showPercentage && (
          <span className="reading-progress-percentage">
            {Math.round(stats.progress)}%
          </span>
        )}
        
        {showTimeEstimate && stats.timeRemaining > 0 && (
          <span className="reading-progress-time">
            <md-icon>schedule</md-icon>
            {stats.timeRemaining} min left
          </span>
        )}
        
        <span className="reading-progress-words">
          {stats.wordsRead.toLocaleString()} / {stats.totalWords.toLocaleString()} words
        </span>
      </div>
    </div>
  );
};

export default ReadingProgress;
