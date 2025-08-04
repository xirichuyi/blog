import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
  className?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    href: '/'
  },
  {
    id: 'articles',
    label: 'Articles',
    icon: 'article',
    href: '/articles'
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: 'category',
    href: '/categories'
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: 'tag',
    href: '/tags'
  },
  {
    id: 'about',
    label: 'About',
    icon: 'person',
    href: '/about'
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: 'contact_mail',
    href: '/contact'
  }
];

const Navigation: React.FC<NavigationProps> = ({
  isOpen,
  onClose,
  currentPath = '/',
  className = ""
}) => {
  const [selectedItem, setSelectedItem] = useState('home');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentItem = navigationItems.find(item => item.href === location.pathname);
    if (currentItem) {
      setSelectedItem(currentItem.id);
    }
  }, [location.pathname]);

  const handleItemClick = (item: NavigationItem) => {
    setSelectedItem(item.id);
    navigate(item.href);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="navigation-backdrop"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Navigation Drawer */}
      <nav className={`navigation-drawer ${isOpen ? 'navigation-open' : ''} ${className}`}>
        <div className="navigation-header">
          <div className="navigation-title">
            <md-icon className="navigation-logo">article</md-icon>
            <h2 className="md-typescale-title-medium">Cyrus Blog</h2>
          </div>
          <md-icon-button 
            className="navigation-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <md-icon>close</md-icon>
          </md-icon-button>
        </div>

        <div className="navigation-content">
          <md-list className="navigation-list">
            {navigationItems.map((item) => (
              <md-list-item
                key={item.id}
                type="button"
                className={`navigation-item ${selectedItem === item.id ? 'selected' : ''}`}
                onClick={() => handleItemClick(item)}
                tabIndex={0}
              >
                <md-icon slot="start">{item.icon}</md-icon>
                <div slot="headline">{item.label}</div>
                {item.badge && (
                  <div slot="end" className="navigation-badge">
                    <span className="badge-text">{item.badge}</span>
                  </div>
                )}
              </md-list-item>
            ))}
          </md-list>

          <md-divider className="navigation-divider"></md-divider>

          {/* Additional Navigation Section */}
          <div className="navigation-section">
            <div className="navigation-section-title md-typescale-title-small">
              Quick Actions
            </div>
            <md-list className="navigation-list">
              <md-list-item type="button" className="navigation-item">
                <md-icon slot="start">search</md-icon>
                <div slot="headline">Search</div>
              </md-list-item>
              <md-list-item type="button" className="navigation-item">
                <md-icon slot="start">bookmark</md-icon>
                <div slot="headline">Bookmarks</div>
              </md-list-item>
              <md-list-item type="button" className="navigation-item">
                <md-icon slot="start">rss_feed</md-icon>
                <div slot="headline">RSS Feed</div>
              </md-list-item>
            </md-list>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="navigation-footer">
          <md-list className="navigation-list">
            <md-list-item type="button" className="navigation-item">
              <md-icon slot="start">settings</md-icon>
              <div slot="headline">Settings</div>
            </md-list-item>
            <md-list-item type="button" className="navigation-item">
              <md-icon slot="start">help</md-icon>
              <div slot="headline">Help</div>
            </md-list-item>
          </md-list>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
