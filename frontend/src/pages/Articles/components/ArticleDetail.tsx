import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../../contexts/DataContext';
import { apiService } from '../../../services/api';
import type { Article } from '../../../types/blog';
import ArticleCard from '../../../components/blog/ArticleCard';
import MarkdownRenderer from '../../../components/ui/MarkdownRenderer';
import './ArticleDetail.css';

interface ArticleDetailProps {
    articleId: string;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ articleId }) => {
    const navigate = useNavigate();
    const { fetchArticleById, articles } = useData();
    const [article, setArticle] = useState<Article | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
    const [activeHeading, setActiveHeading] = useState<string>('');
    const [isScrollingToHeading, setIsScrollingToHeading] = useState(false);

    useEffect(() => {
        const loadArticle = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const fetchedArticle = await fetchArticleById(articleId);
                if (fetchedArticle) {
                    setArticle(fetchedArticle);

                    // Find related articles (same category, excluding current article)
                    const related = articles
                        .filter((a: Article) => a.id !== articleId && a.category === fetchedArticle.category)
                        .slice(0, 3);
                    setRelatedArticles(related);
                } else {
                    setError('Article not found');
                }
            } catch (err) {
                setError('Failed to load article');
                console.error('Error loading article:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadArticle();
    }, [articleId, fetchArticleById, articles]);

    // Extract headings from markdown content for table of contents
    const extractHeadings = useCallback((content: string) => {
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        const headings = [];
        let match;

        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length;
            const title = match[2].trim();
            const id = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            headings.push({ level, title, id });
        }

        return headings;
    }, []);

    // Scroll to heading
    const scrollToHeading = useCallback((headingId: string) => {
        const element = document.getElementById(headingId);
        if (element) {
            setIsScrollingToHeading(true);
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveHeading(headingId);

            setTimeout(() => {
                setIsScrollingToHeading(false);
            }, 1000);
        }
    }, []);

    // Handle scroll to update active heading
    useEffect(() => {
        if (!article || isScrollingToHeading) return;

        const handleScroll = () => {
            const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
            let currentHeading = '';

            headings.forEach((heading) => {
                const rect = heading.getBoundingClientRect();
                if (rect.top <= 100) {
                    currentHeading = heading.id;
                }
            });

            if (currentHeading !== activeHeading) {
                setActiveHeading(currentHeading);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [article, activeHeading, isScrollingToHeading]);

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Calculate reading time
    const calculateReadingTime = (content: string) => {
        const wordsPerMinute = 200;
        const words = content.split(/\s+/).length;
        const readingTime = Math.ceil(words / wordsPerMinute);
        return readingTime;
    };

    if (isLoading) {
        return (
            <div className="article-detail">
                <div className="article-loading">
                    <md-circular-progress indeterminate></md-circular-progress>
                    <p>Loading article...</p>
                </div>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="article-detail">
                <div className="article-error">
                    <md-icon className="error-icon">error_outline</md-icon>
                    <h2>Article Not Found</h2>
                    <p>{error || 'The article you\'re looking for doesn\'t exist.'}</p>
                    <md-filled-button onClick={() => navigate('/articles')}>
                        <md-icon slot="icon">arrow_back</md-icon>
                        Back to Articles
                    </md-filled-button>
                </div>
            </div>
        );
    }

    const headings = extractHeadings(article.content);
    const readingTime = calculateReadingTime(article.content);

    return (
        <div className="article-detail">
            <div className="article-detail-container">
                {/* Article Header */}
                <header className="article-header">
                    <div className="article-breadcrumb">
                        <md-text-button onClick={() => navigate('/articles')}>
                            <md-icon slot="icon">arrow_back</md-icon>
                            Articles
                        </md-text-button>
                        <md-icon className="breadcrumb-separator">chevron_right</md-icon>
                        <span className="current-article">{article.title}</span>
                    </div>

                    <div className="article-meta">
                        <span className="article-category">{article.category}</span>
                        <span className="article-date">{formatDate(article.publishDate)}</span>
                        <span className="article-reading-time">{readingTime} min read</span>
                    </div>

                    <h1 className="article-title">{article.title}</h1>

                    {article.excerpt && (
                        <p className="article-excerpt">{article.excerpt}</p>
                    )}

                    <div className="article-tags">
                        {article.tags.map((tag, index) => (
                            <span key={index} className="article-tag">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Article Image */}
                    {(article.coverImage || article.imageUrl) && (
                        <div className="article-image">
                            <img
                                src={article.coverImage || article.imageUrl}
                                alt={article.title}
                                loading="lazy"
                            />
                        </div>
                    )}
                </header>

                {/* Main Content */}
                <div className="article-main">
                    {/* Table of Contents */}
                    {headings.length > 0 && (
                        <aside className="article-toc">
                            <div className="toc-sticky">
                                <h3 className="toc-title">Table of Contents</h3>
                                <nav className="toc-nav">
                                    {headings.map((heading, index) => (
                                        <button
                                            key={index}
                                            className={`toc-item toc-level-${heading.level} ${activeHeading === heading.id ? 'active' : ''
                                                }`}
                                            onClick={() => scrollToHeading(heading.id)}
                                        >
                                            {heading.title}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </aside>
                    )}

                    {/* Article Content */}
                    <div className="article-content">
                        <MarkdownRenderer content={article.content} />
                    </div>
                </div>

                {/* Article Footer */}
                <footer className="article-footer">
                    <div className="article-actions">
                        <md-outlined-button onClick={() => navigate('/articles')}>
                            <md-icon slot="icon">arrow_back</md-icon>
                            Back to Articles
                        </md-outlined-button>
                    </div>
                </footer>

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                    <section className="related-articles">
                        <h2 className="related-title">Related Articles</h2>
                        <div className="related-grid">
                            {relatedArticles.map((relatedArticle) => (
                                <ArticleCard
                                    key={relatedArticle.id}
                                    article={relatedArticle}
                                    onClick={() => navigate(`/article/${relatedArticle.id}`)}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ArticleDetail;
