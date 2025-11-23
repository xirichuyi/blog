import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, User, Mail } from 'lucide-react';
import './MobileBottomNav.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={22} />,
      path: '/'
    },
    {
      id: 'articles',
      label: 'Articles',
      icon: <FileText size={22} />,
      path: '/articles'
    },
    {
      id: 'about',
      label: 'About',
      icon: <User size={22} />,
      path: '/about'
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: <Mail size={22} />,
      path: '/contact'
    }
  ];

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-bottom-nav-content">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              className={`mobile-bottom-nav-item ${active ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path)}
              aria-label={item.label}
            >
              <div className="mobile-bottom-nav-icon-container">
                {item.icon}
                {active && (
                  <div className="mobile-bottom-nav-indicator" />
                )}
              </div>
              <span className={`mobile-bottom-nav-label ${active ? 'active' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
