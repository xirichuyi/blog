import React from 'react';
import './MaterialHero.css';

interface MaterialHeroProps {
  title: string;
  subtitle: string;
  className?: string;
}

const MaterialHero: React.FC<MaterialHeroProps> = ({
  title,
  subtitle,
  className = ''
}) => {
  return (
    <section className={`material-hero ${className}`}>
      <div className="material-hero-background">
        <div className="material-hero-shape shape-1"></div>
        <div className="material-hero-shape shape-2"></div>
        <div className="material-hero-shape shape-3"></div>
      </div>
      
      <div className="material-hero-content">
        <div className="material-hero-icons">
          <div className="material-hero-icon">
            <md-icon>circle</md-icon>
          </div>
          <div className="material-hero-icon">
            <md-icon>hexagon</md-icon>
          </div>
          <div className="material-hero-icon">
            <md-icon>star</md-icon>
          </div>
        </div>
        
        <h1 className="material-hero-title">{title}</h1>
        <p className="material-hero-subtitle">{subtitle}</p>
      </div>
    </section>
  );
};

export default MaterialHero;
