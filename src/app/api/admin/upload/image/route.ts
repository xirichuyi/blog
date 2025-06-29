import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { checkAuth } from '@/lib/blog-admin-server';

// 配置上传限制
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// 生成唯一文件名
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName).toLowerCase();
  return `${timestamp}-${random}${extension}`;
}

// 图片上传API
export async function POST(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 检查身份验证
  if (!checkAuth(authToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.' 
      }, { status: 400 });
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成文件名和路径
    const fileName = generateFileName(file.name);
    const filePath = path.join(uploadDir, fileName);

    // 读取文件数据
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 使用Sharp处理图片（压缩和优化）
    let processedBuffer = buffer;
    
    if (file.type !== 'image/gif') { // GIF不进行压缩处理以保持动画
      try {
        processedBuffer = await sharp(buffer)
          .resize(1920, 1080, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 85, 
            progressive: true 
          })
          .toBuffer();
        
        // 如果是JPEG/JPG，更新文件名扩展名
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          const newFileName = fileName.replace(/\.[^/.]+$/, '.jpg');
          const newFilePath = path.join(uploadDir, newFileName);
          await writeFile(newFilePath, processedBuffer);
          
          return NextResponse.json({
            success: true,
            fileName: newFileName,
            url: `/uploads/images/${newFileName}`,
            size: processedBuffer.length
          });
        }
      } catch (sharpError) {
        console.warn('Sharp processing failed, using original file:', sharpError);
        processedBuffer = buffer;
      }
    }

    // 保存文件
    await writeFile(filePath, processedBuffer);

    return NextResponse.json({
      success: true,
      fileName,
      url: `/uploads/images/${fileName}`,
      size: processedBuffer.length
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
