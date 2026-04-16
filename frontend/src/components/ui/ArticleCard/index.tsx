import React, { useState } from 'react';
import './style.css';

export interface ArticleCardProps {
    id: string;
    title: string;
    description: string;
    date: string;
    tag: string;
    coverImage?: string;
    gradient: string;
    onClick: (id: string) => void;
    className?: string;
    variant?: 'default' | 'compact' | 'mobile';
    style?: React.CSSProperties;
}

const ArticleCard: React.FC<ArticleCardProps> = ({
    id,
    title,
    description,
    date,
    tag,
    coverImage,
    gradient,
    onClick,
    className = '',
    variant = 'default',
    style = {}
}) => {
    const [imageError, setImageError] = useState(false);

    const handleClick = () => {
        onClick(id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(id);
        }
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        // XSS fix: Use state instead of innerHTML
        setImageError(true);
    };

    return (
        <div
            className={`article-card article-card--${variant} ${!coverImage || imageError ? 'article-card--no-image' : ''} ${className}`}
            onClick={handleClick}
            style={{ cursor: 'pointer', ...style }}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            {coverImage && (
                <div className="article-card-image">
                    {!imageError ? (
                        <img
                            src={coverImage}
                            alt={title}
                            className="article-card-img"
                            onError={handleImageError}
                        />
                    ) : (
                        <div className="article-card-fallback">
                            <div className="article-fallback-content">
                                <md-icon class="fallback-icon" style={{ fontSize: '48px' }}>image_not_supported</md-icon>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className="article-card-content">
                <div className="article-card-meta">
                    <span className="article-card-tag">{tag}</span>
                    <span className="article-card-date">{date}</span>
                </div>
                <h3 className="article-card-title">{title}</h3>
                <p className="article-card-description">{description}</p>
            </div>
        </div>
    );
};

export default ArticleCard;
