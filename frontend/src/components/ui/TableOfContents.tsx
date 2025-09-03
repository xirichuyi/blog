import React, { useState, useEffect, useRef } from 'react';
import './TableOfContents.css';

interface TocItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

interface TableOfContentsProps {
  target?: string; // CSS selector for the content container
  headingSelector?: string; // CSS selector for headings
  className?: string;
  maxLevel?: number; // Maximum heading level to include (1-6)
  minLevel?: number; // Minimum heading level to include (1-6)
  sticky?: boolean;
  collapsible?: boolean;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
  target = '.article-content',
  headingSelector = 'h1, h2, h3, h4, h5, h6',
  className = '',
  maxLevel = 4,
  minLevel = 1,
  sticky = true,
  collapsible = true
}) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetElement = document.querySelector(target);
    if (!targetElement) return;

    // Find all headings and create TOC items
    const headings = targetElement.querySelectorAll(headingSelector) as NodeListOf<HTMLElement>;
    const items: TocItem[] = [];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      // Filter by level
      if (level < minLevel || level > maxLevel) return;

      // Generate or use existing ID
      let id = heading.id;
      if (!id) {
        id = `heading-${index}-${heading.textContent?.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') || ''}`;
        heading.id = id;
      }

      items.push({
        id,
        text: heading.textContent || '',
        level,
        element: heading
      });
    });

    setTocItems(items);
    setIsVisible(items.length > 0);

    // Set up intersection observer for active heading tracking
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // Find the topmost visible heading
          const topEntry = visibleEntries.reduce((top, entry) => 
            entry.boundingClientRect.top < top.boundingClientRect.top ? entry : top
          );
          
          setActiveId(topEntry.target.id);
        }
      },
      {
        rootMargin: '-20% 0px -35% 0px',
        threshold: 0
      }
    );

    // Observe all headings
    items.forEach(item => {
      if (observerRef.current) {
        observerRef.current.observe(item.element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [target, headingSelector, maxLevel, minLevel]);

  const handleItemClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for fixed headers
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Update active state immediately for better UX
      setActiveId(id);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (!isVisible || tocItems.length === 0) {
    return null;
  }

  return (
    <div 
      ref={tocRef}
      className={`table-of-contents ${sticky ? 'sticky' : ''} ${isCollapsed ? 'collapsed' : ''} ${className}`}
    >
      <div className="toc-header">
        <h3 className="toc-title md-typescale-title-medium">
          <md-icon>list</md-icon>
          Table of Contents
        </h3>
        {collapsible && (
          <md-icon-button 
            onClick={toggleCollapse}
            class="toc-toggle"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <md-icon>{isCollapsed ? 'expand_more' : 'expand_less'}</md-icon>
          </md-icon-button>
        )}
      </div>

      <nav className="toc-nav" aria-label="Table of contents">
        <ul className="toc-list">
          {tocItems.map((item) => (
            <li 
              key={item.id}
              className={`toc-item toc-level-${item.level} ${activeId === item.id ? 'active' : ''}`}
            >
              <button
                className="toc-link"
                onClick={() => handleItemClick(item.id)}
                title={item.text}
              >
                <span className="toc-text">{item.text}</span>
                {activeId === item.id && (
                  <md-icon class="toc-active-indicator">arrow_forward</md-icon>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Progress indicator */}
      <div className="toc-progress">
        <div className="toc-progress-bar">
          <div 
            className="toc-progress-fill"
            style={{ 
              height: `${tocItems.length > 0 ? (tocItems.findIndex(item => item.id === activeId) + 1) / tocItems.length * 100 : 0}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TableOfContents;
