import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Sun, Moon } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import './MobileTopBar.css';

interface MobileTopBarProps {
  title?: string;
  showSearch?: boolean;
  className?: string;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({
  title = "Chuyi's Blog",
  showSearch = false,
  className = ""
}) => {
  const navigate = useNavigate();

  const handleSearchClick = () => {
    navigate('/articles');
  };

  const handleTitleClick = () => {
    navigate('/');
  };

  return (
    <header className={`mobile-top-bar ${className}`}>
      <div className="mobile-top-bar-content">
        {/* Logo/Title */}
        <button 
          className="mobile-top-bar-title" 
          onClick={handleTitleClick}
          aria-label="Go to home"
        >
          <FileText className="mobile-top-bar-logo" size={20} />
          <span className="mobile-top-bar-text">{title}</span>
        </button>

        {/* Actions */}
        <div className="mobile-top-bar-actions">
          {showSearch && (
            <button
              className="mobile-top-bar-action-button"
              onClick={handleSearchClick}
              aria-label="Search"
            >
              <Search size={20} />
            </button>
          )}
          
          <div className="mobile-theme-toggle-wrapper">
            <ThemeToggle size="small" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileTopBar;
