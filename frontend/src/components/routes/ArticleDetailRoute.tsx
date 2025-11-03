import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import Layout from '../layout/Layout';
import ArticleDetail from '../../pages/Articles/components/ArticleDetail';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { Article } from '../../services/types';

const ArticleDetailRoute: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { showNotification } = useNotification();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError('Article ID not provided');
            setLoading(false);
            return;
        }

        const loadArticle = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await apiService.getPost(id);

                if (response.success && response.data) {
                    setArticle(response.data);
                } else {
                    setError(response.error || 'Article not found');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load article';
                setError(errorMessage);
                showNotification({
                    type: 'error',
                    title: 'Loading Error',
                    message: errorMessage,
                });
            } finally {
                setLoading(false);
            }
        };

        loadArticle();
    }, [id, showNotification]);

    if (loading) {
        return (
            <Layout title="加载中... - Chuyi的博客">
                <LoadingSpinner />
            </Layout>
        );
    }

    if (error || !article) {
        return (
            <Layout
                title="文章未找到 - Chuyi的博客"
                description="抱歉，您访问的文章不存在或已被删除。"
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    textAlign: 'center',
                    padding: '2rem'
                }}>
                    <h1>文章未找到</h1>
                    <p>{error || '抱歉，您访问的文章不存在或已被删除。'}</p>
                </div>
            </Layout>
        );
    }

    // 计算阅读时间
    const calculateReadingTime = (content: string): number => {
        const wordsPerMinute = 200;
        const words = content.split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
    };

    // 生成文章关键词
    const generateKeywords = (article: Article): string[] => {
        const baseKeywords = ['博客', '技术', '文章', 'Chuyi'];
        const articleKeywords = [
            ...(article.tags || []),
            article.category,
            ...article.title.split(/\s+/).slice(0, 3) // 取标题前3个词作为关键词
        ].filter(Boolean);

        return [...baseKeywords, ...articleKeywords];
    };

    // 生成文章描述
    const generateDescription = (article: Article): string => {
        if (article.excerpt) {
            return article.excerpt.length > 160
                ? article.excerpt.substring(0, 157) + '...'
                : article.excerpt;
        }

        if (article.content) {
            // 移除Markdown标记并截取前160个字符
            const plainText = article.content
                .replace(/[#*`_~\[\]()]/g, '') // 移除常见Markdown标记
                .replace(/\n+/g, ' ') // 将换行符替换为空格
                .trim();

            return plainText.length > 160
                ? plainText.substring(0, 157) + '...'
                : plainText;
        }

        return '欢迎阅读这篇来自Chuyi博客的精彩文章。';
    };

    const readingTime = calculateReadingTime(article.content || '');
    const keywords = generateKeywords(article);
    const description = generateDescription(article);

    return (
        <Layout
            title={article.title}
            description={description}
            keywords={keywords}
            image={article.coverImage || article.imageUrl}
            type="article"
            author={article.author || 'Chuyi'}
            publishedTime={article.publishDate || article.createdAt}
            modifiedTime={article.updatedAt}
            tags={article.tags}
            category={article.category}
            readingTime={readingTime}
        >
            <ArticleDetail article={article} />
        </Layout>
    );
};

export default ArticleDetailRoute;


