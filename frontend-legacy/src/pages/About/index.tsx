import React, { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import { Button } from '@/components/ui/shadcn/button';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

const About: React.FC = () => {
  // ===================================================================
  // A区 - 数据与状态：所有Hooks调用都放在最上面
  // ===================================================================
  
  // 页面数据状态
  const [title, setTitle] = useState<string>('你好，我是 Chuyi');
  const [subtitle, setSubtitle] = useState<string>('全栈开发者 & 技术爱好者');
  const [content, setContent] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 数据加载Hook
  const loadAboutData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const resp = await apiService.getAbout();
      
      if (resp.success && resp.data) {
        setTitle(resp.data.title || title);
        setSubtitle(resp.data.subtitle || subtitle);
        setContent(resp.data.content || '');
        const url = resp.data.photo_url || '';
        setPhotoUrl(url ? apiService.getImageUrl(url) : '');
      } else {
        setError('Failed to load about information');
      }
    } catch (error) {
      console.error('Error loading about data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load about information');
    } finally {
      setLoading(false);
    }
  }, [title, subtitle]);

  // 初始数据加载
  useEffect(() => {
    loadAboutData();
  }, [loadAboutData]);

  // ===================================================================
  // B区 - 核心逻辑：所有事件处理函数和业务逻辑
  // ===================================================================

  // 图片加载错误处理
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/api/placeholder/300/400';
  }, []);

  // 重试加载数据
  const handleRetryLoad = useCallback(() => {
    loadAboutData();
  }, [loadAboutData]);

  // ===================================================================
  // C区 - 渲染：纯声明式渲染
  // ===================================================================

  // 卫语句：加载状态
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 卫语句：错误状态
  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Failed to load about information</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button onClick={handleRetryLoad}>
          <RefreshCw />
          Retry
        </Button>
      </div>
    );
  }

  // 主要渲染
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1fr_auto]">
        {/* 左侧内容 */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">{subtitle}</p>
          <p className="mt-6 max-w-prose text-base leading-relaxed text-foreground/80">
            {content || 'Passionate about creating innovative web applications and sharing knowledge through this blog.'}
          </p>
        </div>

        {/* 右侧照片 */}
        <div className="justify-self-center">
          <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
            <img
              src={photoUrl || '/api/placeholder/300/400'}
              alt="chuyi - Full-Stack Developer"
              onError={handleImageError}
              className="h-80 w-64 object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;