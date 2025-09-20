// Custom hook for lazy loading images with performance optimization

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyImageOptions {
  src: string;
  placeholder?: string;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

interface UseLazyImageReturn {
  imgRef: React.RefObject<HTMLImageElement>;
  isLoaded: boolean;
  isInView: boolean;
  error: boolean;
  currentSrc: string;
}

export const useLazyImage = ({
  src,
  placeholder = '',
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  onError
}: UseLazyImageOptions): UseLazyImageReturn => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  // Intersection Observer callback
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting) {
      setIsInView(true);
    }
  }, []);

  // Set up Intersection Observer
  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold
    });

    observer.observe(imgElement);

    return () => {
      observer.unobserve(imgElement);
    };
  }, [handleIntersection, rootMargin, threshold]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src || isLoaded) return;

    const img = new Image();

    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
      setError(false);
      onLoad?.();
    };

    img.onerror = () => {
      setError(true);
      onError?.();
    };

    img.src = src;
  }, [isInView, src, isLoaded, onLoad, onError]);

  return {
    imgRef,
    isLoaded,
    isInView,
    error,
    currentSrc
  };
};

// Lazy Image Component
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder?: string;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  alt: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder = '',
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  onError,
  className = '',
  alt,
  ...props
}) => {
  const { imgRef, isLoaded, currentSrc, error } = useLazyImage({
    src,
    placeholder,
    rootMargin,
    threshold,
    onLoad,
    onError
  });

  return (
    <img
      ref= { imgRef }
  src = { currentSrc }
  alt = { alt }
  className = {`lazy-image ${isLoaded ? 'loaded' : 'loading'} ${error ? 'error' : ''} ${className}`
}
{...props }
style = {{
  transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0.7,
        ...props.style
}}
    />
  );
};

export default useLazyImage;