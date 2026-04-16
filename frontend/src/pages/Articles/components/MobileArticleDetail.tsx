import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, List, Loader2, AlertCircle, User, Calendar, Clock, Folder, Tag as TagIcon, Eye, Copy, Check } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { apiService } from '../../../services/api';
import type { Article } from '../../../services/types';
import MarkdownRenderer from '../../../components/ui/MarkdownRenderer';
import { logger } from '../../../utils/logger';
import './MobileArticleDetail.css';

const MobileArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTOC, setShowTOC] = useState(false);
  const [copied, setCopied] = useState(false);

  // 加载文章
  const loadArticle = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getArticle(id);

      if (response.success && response.data) {
        setArticle(response.data);
      } else {
        setError(response.error || 'Failed to load article');
      }
    } catch (err) {
      logger.error('Error loading article:', err);
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  // 返回
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // 分享
  const handleShare = useCallback(async () => {
    if (!article) return;

    const shareData = {
      title: article.title,
      text: article.excerpt || article.title,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // 复制链接到剪贴板
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      logger.error('Error sharing:', err);
    }
  }, [article]);

  // 格式化日期
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // 加载状态
  if (isLoading) {
    return (
      <div className="mobile-article-detail">
        <div className="mobile-article-loading">
          <Loader2 className="loading-spinner" size={32} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !article) {
    return (
      <div className="mobile-article-detail">
        <div className="mobile-article-error">
          <AlertCircle className="error-icon" size={48} />
          <p>{error || 'Article not found'}</p>
          <button className="apple-button-base apple-button-primary" onClick={handleBack}>
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-article-detail">
      {/* 固定操作栏 */}
      <div className="mobile-article-actions">
        <button 
          className="mobile-action-button"
          onClick={handleBack} 
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="mobile-article-actions-right">
          <button 
            className="mobile-action-button"
            onClick={handleShare} 
            aria-label="Share"
          >
            {copied ? <Check size={20} /> : <Share2 size={20} />}
          </button>
          <button 
            className="mobile-action-button"
            onClick={() => setShowTOC(true)} 
            aria-label="Table of Contents"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* 文章头部 */}
      <header className="mobile-article-header">
        {article.coverImage && (
          <div className="mobile-article-cover">
            <img src={article.coverImage} alt={article.title} loading="eager" />
          </div>
        )}

        <div className="mobile-article-header-content">
          <h1 className="mobile-article-title">{article.title}</h1>

          <div className="mobile-article-meta">
            <div className="mobile-meta-item">
              <User size={16} />
              <span>{article.author}</span>
            </div>
            <div className="mobile-meta-item">
              <Calendar size={16} />
              <span>{formatDate(article.publishDate)}</span>
            </div>
            {article.readTime > 0 && (
              <div className="mobile-meta-item">
                <Clock size={16} />
                <span>{article.readTime} min</span>
              </div>
            )}
          </div>

          {/* 分类和标签 */}
          <div className="mobile-article-tags">
            {article.category && (
              <span className="mobile-tag-chip">
                <Folder size={14} />
                <span>{article.category}</span>
              </span>
            )}
            {article.tags && article.tags.length > 0 && (
              <>
                {article.tags.map((tag, index) => (
                  <span key={index} className="mobile-tag-chip">
                    <TagIcon size={14} />
                    <span>{tag}</span>
                  </span>
                ))}
              </>
            )}
          </div>

          {/* 摘要 */}
          {article.excerpt && (
            <div className="mobile-article-excerpt">
              <p>{article.excerpt}</p>
            </div>
          )}
        </div>
      </header>

      {/* 文章内容 */}
      <article className="mobile-article-content">
        <MarkdownRenderer content={article.content ?? ''} />
      </article>

      {/* 文章底部信息 */}
      <footer className="mobile-article-footer">
        <div className="mobile-article-stats">
          <div className="mobile-stat-item">
            <Eye size={16} />
            <span>views</span>
          </div>
        </div>

        <div className="mobile-article-separator" />

        <div className="mobile-article-actions-bottom">
          <button 
            className="apple-button-base apple-button-outline"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
            <span>Back to List</span>
          </button>
          <button 
            className="apple-button-base apple-button-primary"
            onClick={handleShare}
          >
            <Share2 size={18} />
            <span>Share</span>
          </button>
        </div>
      </footer>

      {/* 目录抽屉 - Radix UI Dialog */}
      <Dialog.Root open={showTOC} onOpenChange={setShowTOC}>
        <Dialog.Portal>
          <Dialog.Overlay className="mobile-toc-overlay" />
          <Dialog.Content className="mobile-toc-drawer">
            <div className="mobile-toc-header">
              <Dialog.Title className="mobile-toc-title">Table of Contents</Dialog.Title>
              <Dialog.Close className="mobile-toc-close">
                <ArrowLeft size={20} />
              </Dialog.Close>
            </div>
            <div className="mobile-toc-content">
              {/* TOC会由MarkdownRenderer自动生成 */}
              <p className="mobile-toc-placeholder">Table of contents will be displayed here</p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default MobileArticleDetail;
