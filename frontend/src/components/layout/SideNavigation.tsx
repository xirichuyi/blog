import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import './SideNavigation.css';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

interface SideNavigationProps {
  className?: string;
}

const SideNavigation: React.FC<SideNavigationProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home',
      path: '/'
    },
    {
      id: 'articles',
      label: 'Articles',
      icon: 'article',
      path: '/articles'
    },
    {
      id: 'about',
      label: 'About',
      icon: 'person',
      path: '/about'
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: 'mail',
      path: '/contact'
    }
  ];

  const handleItemClick = (item: NavigationItem) => {
    navigate(item.path);
  };



  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`side-navigation ${className}`}>
      <div className="side-navigation-content">
        {navigationItems.map((item) => (
          <div
            key={item.id}
            className={`side-navigation-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleItemClick(item)}
            role="button"
            tabIndex={0}
            aria-label={item.label}
          >
            <div className="side-navigation-icon-container">
              <md-icon className="side-navigation-icon">{item.icon}</md-icon>
              {item.badge && (
                <md-badge value={item.badge.toString()} className="side-navigation-badge" />
              )}
            </div>
            <span className="side-navigation-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Theme Toggle at Bottom */}
      <div className="side-navigation-footer">
        <div className="side-navigation-item">
          <div className="side-navigation-icon-container">
            <ThemeToggle size="small" />
          </div>
          <span className="side-navigation-label">Theme</span>
        </div>
      </div>
    </nav>
  );
};

export default SideNavigation;
