"use client";

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // 如果当前路径是admin相关页面，则不显示Footer
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  // 其他页面正常显示Footer
  return <Footer />;
}
