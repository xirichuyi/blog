import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 中间件函数
export function middleware(request: NextRequest) {
  // 获取路径
  const path = request.nextUrl.pathname;
  
  // 检查是否是管理页面路径
  const isAdminPath = path.startsWith('/admin');
  
  // 排除登录页面
  const isLoginPath = path === '/admin/login';
  
  // 如果是管理页面但不是登录页面，检查是否有令牌
  if (isAdminPath && !isLoginPath) {
    // 从cookie或localStorage获取令牌
    // 注意：在中间件中无法访问localStorage，所以我们需要使用cookie
    const token = request.cookies.get('blog-admin-token')?.value;
    
    // 如果没有令牌，重定向到登录页面
    if (!token) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('from', path);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

// 配置中间件匹配的路径
export const config = {
  matcher: ['/admin/:path*'],
};
