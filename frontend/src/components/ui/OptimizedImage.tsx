// Next-gen image format optimization component

import React from 'react';
import { LazyImage } from '../../hooks/useLazyImage';

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
 * OptimizedImage component that supports next-gen formats (WebP, AVIF) with proper fallbacks
 * 
 * Features:
 * - Automatically generates WebP and AVIF sources when available
 * - Falls back to original format when next-gen formats aren't supported
 * - Integrates with LazyImage for intersection observer-based loading
 * - Supports priority loading for above-the-fold images
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
    // Extract file extension and base path
    const getFileInfo = (path: string) => {
        const lastDotIndex = path.lastIndexOf('.');
        if (lastDotIndex === -1) return { basePath: path, extension: '' };

        const basePath = path.substring(0, lastDotIndex);
        const extension = path.substring(lastDotIndex + 1);
        return { basePath, extension };
    };

    const { basePath, extension } = getFileInfo(src);

    // Skip next-gen format handling for SVGs and GIFs
    const skipNextGenFormats = ['svg', 'gif'].includes(extension.toLowerCase());

    // Check if the image is hosted on the same origin or is an external URL
    const isExternalImage = src.startsWith('http') && !src.startsWith(window.location.origin);

    // For external images or SVGs/GIFs, just use the LazyImage component directly
    if (isExternalImage || skipNextGenFormats) {
        return (
            <LazyImage
                src={src}
                alt={alt}
                className={className}
                placeholder={placeholder}
                rootMargin={priority ? '200px' : '50px'}
                threshold={0.1}
                onLoad={onLoad}
                onError={onError}
                style={style}
                width={width}
                height={height}
            />
        );
    }

    // For local images that can benefit from next-gen formats
    return (
        <picture>
            {/* AVIF format - best compression, newer browsers */}
            <source
                srcSet={`${basePath}.avif`}
                type="image/avif"
            />

            {/* WebP format - good compression, wide support */}
            <source
                srcSet={`${basePath}.webp`}
                type="image/webp"
            />

            {/* Original format as fallback */}
            <LazyImage
                src={src}
                alt={alt}
                className={className}
                placeholder={placeholder}
                rootMargin={priority ? '200px' : '50px'}
                threshold={0.1}
                onLoad={onLoad}
                onError={onError}
                style={style}
                width={width}
                height={height}
            />
        </picture>
    );
};

export default OptimizedImage;

