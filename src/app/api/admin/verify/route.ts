import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/blog-admin';

// 验证管理员令牌
export async function GET(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
