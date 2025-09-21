import React, { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import './style.css';

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
      <div className="about-page" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <md-circular-progress indeterminate></md-circular-progress>
      </div>
    );
  }

  // 卫语句：错误状态
  if (error) {
    return (
      <div className="about-page" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        gap: '16px'
      }}>
        <md-icon style={{ fontSize: '48px', color: 'var(--md-sys-color-error)' }}>error</md-icon>
        <div style={{ color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'center' }}>
          <h3>Failed to load about information</h3>
          <p>{error}</p>
        </div>
        <md-filled-button onClick={handleRetryLoad}>
          <md-icon slot="icon">refresh</md-icon>
          Retry
        </md-filled-button>
      </div>
    );
  }

  // 主要渲染
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-content">
          {/* 左侧内容 */}
          <div className="about-content">
            <h1 className="about-title md-typescale-display-medium">
              {title}
            </h1>
            <p className="about-subtitle md-typescale-headline-small">
              {subtitle}
            </p>
            <p className="about-description md-typescale-body-large">
              {content || 'Passionate about creating innovative web applications and sharing knowledge through this blog.'}
            </p>
          </div>

          {/* 右侧照片 */}
          <div className="about-photo">
            <div className="photo-container">
              <img
                src={photoUrl || '/api/placeholder/300/400'}
                alt="chuyi - Full-Stack Developer"
                className="profile-photo"
                onError={handleImageError}
              />
              <div className="photo-overlay">
                <md-icon className="camera-icon">photo_camera</md-icon>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;