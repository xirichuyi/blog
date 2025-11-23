/**
 * 设备检测工具函数
 */

/**
 * 检测是否为移动设备
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.innerWidth < 768;
};

/**
 * 检测是否为平板设备
 */
export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};

/**
 * 检测是否为桌面设备
 */
export const isDesktopDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.innerWidth >= 1024;
};

/**
 * 获取设备类型
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};

/**
 * 检测是否为iOS设备
 */
export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * 检测是否为Android设备
 */
export const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
};

/**
 * 获取视口尺寸
 */
export const getViewportSize = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

