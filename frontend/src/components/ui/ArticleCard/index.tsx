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
    variant?: 'default' | 'compact';
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
            className={`article-card article-card--${variant} ${className}`}
            onClick={handleClick}
            style={{ cursor: 'pointer', ...style }}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <div className="article-card-image">
                {coverImage && !imageError ? (
                    <img
                        src={coverImage}
                        alt={title}
                        className="article-card-img"
                        onError={handleImageError}
                    />
                ) : (
                    <div className="article-card-fallback" style={{ background: gradient }}>
                        <div className="article-fallback-content">
                            <div className="fallback-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}
            </div>
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
