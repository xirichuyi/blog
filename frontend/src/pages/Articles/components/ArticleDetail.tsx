import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../../services/api'
import type { Article } from '../../../services/types';
// import ArticleCard from '../../../components/blog/ArticleCard'; // Temporarily commented
import MarkdownRenderer from '../../../components/ui/MarkdownRenderer';
import './ArticleDetail.css';

interface ArticleDetailProps {
    articleId: string;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ articleId }) => {
    const navigate = useNavigate();
    const [article, setArticle] = useState<Article | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
    const [activeHeading, setActiveHeading] = useState<string>('');
    const [isScrollingToHeading, setIsScrollingToHeading] = useState(false);
    const [tocBottomOffset, setTocBottomOffset] = useState<number>(0);

    useEffect(() => {
        const loadArticle = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await apiService.getArticle(articleId);
                const fetchedArticle = response.success ? response.data : null;
                if (fetchedArticle) {
                    setArticle(fetchedArticle);

                    // Load related articles (same category, excluding current article)
                    if (fetchedArticle.category_id) {
                        const relatedResponse = await apiService.getArticles({
                            category: fetchedArticle.category_id,
                            status: 'published'
                        });
                        if (relatedResponse.success && relatedResponse.data) {
                            const related = relatedResponse.data
                                .filter((a: Article) => a.id !== articleId && a.status === 'published')
                                .slice(0, 3);
                            setRelatedArticles(related);
                        }
                    }
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
    }, [articleId]);

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

    // Handle scroll to update active heading and TOC position
    useEffect(() => {
        if (!article || isScrollingToHeading) return;

        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    // Handle active heading detection
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

                    // Handle TOC positioning - only move up when near bottom
                    const windowHeight = window.innerHeight;
                    const documentHeight = document.documentElement.scrollHeight;
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollBottom = scrollTop + windowHeight;

                    // Check distance from bottom (within 300px of footer)
                    const distanceFromBottom = documentHeight - scrollBottom;

                    if (distanceFromBottom <= 300) {
                        // Calculate how much to move TOC up from its normal position
                        const offset = Math.max(0, 300 - distanceFromBottom);
                        setTocBottomOffset(offset);
                    } else {
                        setTocBottomOffset(0);
                    }

                    ticking = false;
                });
                ticking = true;
            }
        };

        // Add passive listener for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Initial call to set active heading and position
        handleScroll();

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
            {/* Table of Contents Sidebar */}
            {headings.length > 0 && (
                <aside
                    className="article-toc-sidebar"
                    style={{
                        transform: `translateY(-${tocBottomOffset}px)`,
                        transition: 'transform 0.3s ease-out'
                    }}
                >
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

            <div className="article-detail-container">
                {/* Article Header */}
                <header className="article-header">
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

                {/* Article Content */}
                <main className="article-content">
                    <MarkdownRenderer content={article.content} />
                </main>

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
