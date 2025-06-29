import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { checkAuth } from '@/lib/blog-admin-server';

// 图片删除API
export async function DELETE(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    // 安全检查：确保文件名不包含路径遍历字符
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    // 构建文件路径
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'images', fileName);

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 删除文件
    await unlink(filePath);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
