import React, { useState, useEffect, useCallback, useRef } from 'react';
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

    // Performance optimization: use refs to avoid unnecessary re-renders
    const lastActiveHeadingRef = useRef<string>('');
    const lastTocOffsetRef = useRef<number>(0);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            // 清除之前的滚动定时器
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // 立即设置目标heading为active，避免滚动过程中的干扰
            setIsScrollingToHeading(true);
            setActiveHeading(headingId);

            // 更新ref缓存，确保滚动监听器不会覆盖这个选择
            lastActiveHeadingRef.current = headingId;

            // Calculate offset to account for fixed elements
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - 80; // 80px offset from top

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            // 使用ref存储定时器，避免快速点击时的冲突
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrollingToHeading(false);
                scrollTimeoutRef.current = null;
            }, 1800); // 稍微缩短时间但确保足够
        } else {
            console.warn(`Element with id "${headingId}" not found`);
        }
    }, []);

    // Handle scroll to update active heading and TOC position with debouncing
    useEffect(() => {
        if (!article || isScrollingToHeading) return;

        let headingsCache: NodeListOf<Element> | null = null;
        let debounceTimer: NodeJS.Timeout | null = null;
        let rafId: number | null = null;

        // Current values that don't trigger re-renders
        let currentActiveHeading = '';
        let currentTocOffset = 0;

        const updateStates = () => {
            // 如果正在执行点击导航，跳过自动更新activeHeading
            if (!isScrollingToHeading && currentActiveHeading !== lastActiveHeadingRef.current) {
                lastActiveHeadingRef.current = currentActiveHeading;
                setActiveHeading(currentActiveHeading);
            }

            // TOC位置始终更新（不受点击导航影响）
            if (currentTocOffset !== lastTocOffsetRef.current) {
                lastTocOffsetRef.current = currentTocOffset;
                setTocBottomOffset(currentTocOffset);
            }
        };

        const calculatePositions = () => {
            const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

            // Cache headings to avoid repeated DOM queries
            if (!headingsCache) {
                headingsCache = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
            }

            // Find active heading with optimized single loop
            let closestHeading = null;
            let closestDistance = Infinity;
            let fallbackHeading = '';

            for (let i = 0; i < headingsCache.length; i++) {
                const heading = headingsCache[i];
                const rect = heading.getBoundingClientRect();

                // Early exit optimization
                if (rect.top > 300) break;

                const distance = Math.abs(rect.top - 120);

                if (rect.top <= 200 && distance < closestDistance) {
                    closestDistance = distance;
                    closestHeading = heading.id;
                } else if (rect.top <= 120) {
                    fallbackHeading = heading.id;
                }
            }

            currentActiveHeading = closestHeading || fallbackHeading;

            // Calculate TOC offset
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollBottom = currentScrollY + windowHeight;
            const distanceFromBottom = documentHeight - scrollBottom;

            currentTocOffset = distanceFromBottom <= 300
                ? Math.max(0, 300 - distanceFromBottom)
                : 0;
        };

        const handleScroll = () => {
            // Cancel previous RAF if still pending
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            // Use RAF for smooth calculation
            rafId = requestAnimationFrame(() => {
                calculatePositions();

                // Clear existing debounce timer
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }

                // Debounce state updates by 100ms
                debounceTimer = setTimeout(updateStates, 100);
            });
        };

        // Add passive listener for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Initial call
        calculatePositions();
        updateStates();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (debounceTimer) clearTimeout(debounceTimer);
            if (rafId) cancelAnimationFrame(rafId);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            headingsCache = null;
        };
    }, [article, isScrollingToHeading]);

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
