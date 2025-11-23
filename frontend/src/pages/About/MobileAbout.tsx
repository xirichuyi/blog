import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import './MobileAbout.css';

const MobileAbout: React.FC = () => {
  // Data states - aligned with PC version
  const [title, setTitle] = useState<string>('Hello, I\'m Chuyi');
  const [subtitle, setSubtitle] = useState<string>('Full-Stack Developer & Tech Enthusiast');
  const [content, setContent] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Image error handler
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/api/placeholder/300/400';
  }, []);

  useEffect(() => {
    const loadAbout = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiService.getAbout();
        
        if (response.success && response.data) {
          setTitle(response.data.title || title);
          setSubtitle(response.data.subtitle || subtitle);
          setContent(response.data.content || '');
          const url = response.data.photo_url || '';
          setPhotoUrl(url ? apiService.getImageUrl(url) : '');
        } else {
          setError('Failed to load about information');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load about information');
      } finally {
        setIsLoading(false);
      }
    };

    loadAbout();
  }, [title, subtitle]);

  const handleRetry = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="mobile-about">
        <div className="mobile-about-loading">
          <Loader2 className="loading-spinner" size={32} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-about">
        <div className="mobile-about-error">
          <AlertCircle className="error-icon" size={48} />
          <p>{error}</p>
          <button className="apple-button-base apple-button-primary" onClick={handleRetry}>
            <RefreshCw size={18} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-about">
      {/* Hero Section - Apple Style: Photo on top, description below */}
      <div className="mobile-about-hero">
        {photoUrl && (
          <div className="mobile-about-photo">
            <img
              src={photoUrl}
              alt={title}
              className="mobile-about-photo-img"
              onError={handleImageError}
            />
          </div>
        )}
        
        <div className="mobile-about-info">
          <h1 className="mobile-about-title">{title}</h1>
          <p className="mobile-about-subtitle">{subtitle}</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="mobile-about-content">
        {content ? (
          <div className="mobile-about-text">
            {content.split('\n').map((paragraph, index) => (
              paragraph.trim() && (
                <p key={index} className="mobile-about-paragraph">
                  {paragraph}
                </p>
              )
            ))}
          </div>
        ) : (
          <div className="mobile-about-empty">
            <p>No content available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileAbout;
