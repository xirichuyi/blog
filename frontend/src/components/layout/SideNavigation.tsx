import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Category, Tag } from '../../types';
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

  // State for hover menus
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load categories and tags on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [categoriesResponse, tagsResponse] = await Promise.all([
          apiService.getPublicCategories(),
          apiService.getPublicTags()
        ]);

        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }

        if (tagsResponse.success && tagsResponse.data) {
          setTags(tagsResponse.data);
        }
      } catch (error) {
        console.error('Failed to load categories and tags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Handle category selection
  const handleCategorySelect = async (categoryId: string) => {
    setShowCategoriesMenu(false);
    try {
      const response = await apiService.getPostsByCategory(categoryId);
      if (response.success) {
        navigate('/articles', { state: { filteredBy: 'category', categoryId, articles: response.data } });
      }
    } catch (error) {
      console.error('Failed to filter by category:', error);
      navigate('/categories');
    }
  };

  // Handle tag selection
  const handleTagSelect = async (tagId: string) => {
    setShowTagsMenu(false);
    try {
      const response = await apiService.getPostsByTag(tagId);
      if (response.success) {
        navigate('/articles', { state: { filteredBy: 'tag', tagId, articles: response.data } });
      }
    } catch (error) {
      console.error('Failed to filter by tag:', error);
      navigate('/tags');
    }
  };

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
      id: 'categories',
      label: 'Categories',
      icon: 'category',
      path: '/categories'
    },
    
    
    {
      id: 'about',
      label: 'About',
      icon: 'person',
      path: '/about'
    },
    {
      id: 'tags',
      label: 'Tags',
      icon: 'local_offer',
      path: '/tags'
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: 'mail',
      path: '/contact'
    }
  ];

  const handleItemClick = (item: NavigationItem) => {
    // Don't navigate for categories and tags, they use hover menus
    if (item.id === 'categories' || item.id === 'tags') {
      return;
    }
    navigate(item.path);
  };

  // Handle hover events with delay
  const handleItemHover = (item: NavigationItem, isEntering: boolean) => {
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }

    if (isEntering) {
      // Show menu immediately when entering
      if (item.id === 'categories') {
        setShowCategoriesMenu(true);
        setShowTagsMenu(false);
      } else if (item.id === 'tags') {
        setShowTagsMenu(true);
        setShowCategoriesMenu(false);
      }
    } else {
      // Add delay when leaving to allow mouse movement to menu
      const timeout = setTimeout(() => {
        if (item.id === 'categories') {
          setShowCategoriesMenu(false);
        } else if (item.id === 'tags') {
          setShowTagsMenu(false);
        }
      }, 500); // 500ms delay - longer to make it easier

      setHoverTimeout(timeout);
    }
  };

  // Handle menu hover to keep it open
  const handleMenuHover = (menuType: 'categories' | 'tags', isEntering: boolean) => {
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }

    if (!isEntering) {
      // Add delay when leaving menu
      const timeout = setTimeout(() => {
        if (menuType === 'categories') {
          setShowCategoriesMenu(false);
        } else if (menuType === 'tags') {
          setShowTagsMenu(false);
        }
      }, 300); // 300ms delay when leaving menu

      setHoverTimeout(timeout);
    }
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
            className={`side-navigation-item ${isActive(item.path) ? 'active' : ''} ${
              (item.id === 'categories' && showCategoriesMenu) || (item.id === 'tags' && showTagsMenu)
                ? 'has-hover-menu' : ''
            }`}
            data-has-menu={item.id === 'categories' || item.id === 'tags' ? 'true' : 'false'}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => handleItemHover(item, true)}
            onMouseLeave={() => handleItemHover(item, false)}
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

            {/* Categories Hover Menu */}
            {item.id === 'categories' && showCategoriesMenu && (
              <div
                className="hover-menu categories-menu"
                onMouseEnter={() => handleMenuHover('categories', true)}
                onMouseLeave={() => handleMenuHover('categories', false)}
              >
                <div className="hover-menu-header">
                  <md-icon>category</md-icon>
                  <span>Categories</span>
                </div>
                <div className="hover-menu-content">
                  {isLoading ? (
                    <div className="hover-menu-loading">
                      <md-circular-progress indeterminate></md-circular-progress>
                      <span>Loading...</span>
                    </div>
                  ) : categories.length > 0 ? (
                    categories.map((category) => (
                      <div
                        key={category.id}
                        className="hover-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategorySelect(category.id);
                        }}
                      >
                        <md-icon className="menu-item-icon">{category.icon}</md-icon>
                        <span className="menu-item-name">{category.name}</span>
                        <span className="menu-item-count">({category.count})</span>
                      </div>
                    ))
                  ) : (
                    <div className="hover-menu-empty">
                      <span>No categories found</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags Hover Menu */}
            {item.id === 'tags' && showTagsMenu && (
              <div
                className="hover-menu tags-menu"
                onMouseEnter={() => handleMenuHover('tags', true)}
                onMouseLeave={() => handleMenuHover('tags', false)}
              >
                <div className="hover-menu-header">
                  <md-icon>local_offer</md-icon>
                  <span>Tags</span>
                </div>
                <div className="hover-menu-content">
                  {isLoading ? (
                    <div className="hover-menu-loading">
                      <md-circular-progress indeterminate></md-circular-progress>
                      <span>Loading...</span>
                    </div>
                  ) : tags.length > 0 ? (
                    tags.slice(0, 12).map((tag) => (
                      <div
                        key={tag.id}
                        className="hover-menu-item tag-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagSelect(tag.id);
                        }}
                      >
                        <span className="menu-item-name">{tag.name}</span>
                        <span className="menu-item-count">({tag.count})</span>
                      </div>
                    ))
                  ) : (
                    <div className="hover-menu-empty">
                      <span>No tags found</span>
                    </div>
                  )}
                  {tags.length > 12 && (
                    <div
                      className="hover-menu-more"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/tags');
                        setShowTagsMenu(false);
                      }}
                    >
                      <md-icon>more_horiz</md-icon>
                      <span>View all tags</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Theme Toggle at Bottom */}
      <div className="side-navigation-footer">
        <div className="side-navigation-item">
          <div className="side-navigation-icon-container">
            <md-icon className="side-navigation-icon">brightness_6</md-icon>
          </div>
          <span className="side-navigation-label">Theme</span>
        </div>
      </div>
    </nav>
  );
};

export default SideNavigation;
