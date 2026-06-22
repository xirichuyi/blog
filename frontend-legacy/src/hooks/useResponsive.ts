import { useState, useEffect } from 'react';

// Material Design 3 breakpoints
const breakpoints = {
  compact: 600,
  medium: 840,
  expanded: 1200,
  large: 1600
} as const;

type BreakpointKey = keyof typeof breakpoints;
type ScreenSize = 'compact' | 'medium' | 'expanded' | 'large';

interface ResponsiveState {
  width: number;
  height: number;
  screenSize: ScreenSize;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isLarge: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const getScreenSize = (width: number): ScreenSize => {
  if (width < breakpoints.compact) return 'compact';
  if (width < breakpoints.medium) return 'medium';
  if (width < breakpoints.expanded) return 'expanded';
  return 'large';
};

const useResponsive = (): ResponsiveState => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const screenSize = getScreenSize(windowSize.width);

  return {
    width: windowSize.width,
    height: windowSize.height,
    screenSize,
    isCompact: screenSize === 'compact',
    isMedium: screenSize === 'medium',
    isExpanded: screenSize === 'expanded',
    isLarge: screenSize === 'large',
    isMobile: windowSize.width < breakpoints.compact,
    isTablet: windowSize.width >= breakpoints.compact && windowSize.width < breakpoints.expanded,
    isDesktop: windowSize.width >= breakpoints.expanded,
  };
};

export default useResponsive;
export { breakpoints };
export type { ResponsiveState, ScreenSize };
