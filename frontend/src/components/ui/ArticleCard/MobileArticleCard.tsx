import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import './MobileArticleCard.css';

export interface MobileArticleCardProps {
    id: string;
    title: string;
    description: string;
    date: string;
    tag: string;
    coverImage?: string;
    gradient: string;
    onClick: (id: string) => void;
    className?: string;
    style?: React.CSSProperties;
}

const MobileArticleCard: React.FC<MobileArticleCardProps> = ({
    id,
    title,
    description,
    date,
    tag,
    coverImage,
    gradient,
    onClick,
    className = '',
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

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <article
            className={`mobile-article-card ${className}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={style}
        >
            <div className="mobile-article-card-image">
                {coverImage && !imageError ? (
                    <img
                        src={coverImage}
                        alt={title}
                        className="mobile-article-card-img"
                        onError={handleImageError}
                        loading="lazy"
                    />
                ) : (
                    <div className="mobile-article-card-fallback" style={{ background: gradient }}>
                        <div className="mobile-fallback-content">
                            <FileText size={32} />
                        </div>
                    </div>
                )}
            </div>
            <div className="mobile-article-card-content">
                <div className="mobile-article-card-meta">
                    <span className="mobile-article-card-tag">{tag}</span>
                    <span className="mobile-article-card-date">{date}</span>
                </div>
                <h3 className="mobile-article-card-title">{title}</h3>
                <p className="mobile-article-card-description">{description}</p>
            </div>
        </article>
    );
};

export default MobileArticleCard;
