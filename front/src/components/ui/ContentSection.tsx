import React from 'react';
import './ContentSection.css';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ContentSectionProps {
  items: ContentItem[];
  className?: string;
}

const ContentSection: React.FC<ContentSectionProps> = ({
  items,
  className = ''
}) => {
  return (
    <section className={`content-section ${className}`}>
      <div className="content-section-grid">
        {items.map((item) => (
          <md-elevated-card key={item.id} className="content-card">
            <div className="content-card-content">
              {item.icon && (
                <div className="content-card-icon">
                  <md-icon>{item.icon}</md-icon>
                </div>
              )}
              
              <h3 className="content-card-title">{item.title}</h3>
              <p className="content-card-description">{item.description}</p>
              
              {item.action && (
                <div className="content-card-action">
                  <md-text-button onClick={item.action.onClick}>
                    {item.action.label}
                    <md-icon slot="icon">arrow_forward</md-icon>
                  </md-text-button>
                </div>
              )}
            </div>
          </md-elevated-card>
        ))}
      </div>
    </section>
  );
};

export default ContentSection;
