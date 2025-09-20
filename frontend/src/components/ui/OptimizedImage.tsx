// Simplified image component

import React, { useState, useEffect } from 'react';

interface OptimizedImageProps {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
    placeholder?: string;
    priority?: boolean;
    onLoad?: () => void;
    onError?: () => void;
    style?: React.CSSProperties;
}

/**
 * Simplified image component with basic loading states
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    className = '',
    width,
    height,
    placeholder = '',
    priority = false,
    onLoad,
    onError,
    style = {}
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(placeholder || src);

    const handleLoad = () => {
        setIsLoaded(true);
        setHasError(false);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        onError?.();
    };

    useEffect(() => {
        if (src && src !== placeholder) {
            setCurrentSrc(src);
        }
    }, [src, placeholder]);

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={`${className} ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`}
            width={width}
            height={height}
            onLoad={handleLoad}
            onError={handleError}
            style={{
                transition: 'opacity 0.3s ease-in-out',
                opacity: isLoaded ? 1 : 0.7,
                ...style
            }}
        />
    );
};

export default OptimizedImage;

