import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '../constants';

/**
 * 移动端检测Hook
 * 检测当前设备是否为移动端
 */
export const useIsMobile = (breakpoint: number = BREAKPOINTS.MOBILE): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);

  return isMobile;
};

