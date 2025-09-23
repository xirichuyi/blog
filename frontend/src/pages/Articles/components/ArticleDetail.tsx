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
                    if (fetchedArticle.category) {
                        const relatedResponse = await apiService.getArticles({
                            category: fetchedArticle.category,
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
            // Use the same ID generation logic as MarkdownRenderer
            const id = title.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\u4e00-\u9fff\w-]/g, '') // Keep Chinese characters, ASCII letters, numbers, underscores, and hyphens
                .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
            headings.push({ level, title, id });
        }

        return headings;
    }, []);

    // Scroll to heading with improved targeting
    const scrollToHeading = useCallback((headingId: string) => {
        const element = document.getElementById(headingId);
        if (element) {
            setIsScrollingToHeading(true);
            setActiveHeading(headingId);
            
            // Calculate offset to account for fixed elements
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - 80; // 80px offset from top
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            setTimeout(() => {
                setIsScrollingToHeading(false);
            }, 1500);
        } else {
            console.warn(`Element with id "${headingId}" not found`);
        }
    }, []);

    // Handle scroll to update active heading and TOC position
    useEffect(() => {
        if (!article || isScrollingToHeading) return;

        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    // Handle active heading detection with improved accuracy
                    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
                    let currentHeading = '';
                    let closestHeading = null;
                    let closestDistance = Infinity;

                    headings.forEach((heading) => {
                        const rect = heading.getBoundingClientRect();
                        const distance = Math.abs(rect.top - 120); // 120px offset from top
                        
                        // If heading is visible and closer to our target position
                        if (rect.top <= 200 && distance < closestDistance) {
                            closestDistance = distance;
                            closestHeading = heading.id;
                        }
                    });

                    // Fallback: if no heading is close enough, use the last visible one
                    if (!closestHeading) {
                        headings.forEach((heading) => {
                            const rect = heading.getBoundingClientRect();
                            if (rect.top <= 120) {
                                currentHeading = heading.id;
                            }
                        });
                    } else {
                        currentHeading = closestHeading;
                    }

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
                                <div
                                    key={relatedArticle.id}
                                    className="related-article-item"
                                    onClick={() => navigate(`/article/${relatedArticle.id}`)}
                                >
                                    <h3>{relatedArticle.title}</h3>
                                    <p>{relatedArticle.excerpt}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ArticleDetail;
