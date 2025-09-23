import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownIt from 'markdown-it';
import { apiService } from '../../../services/api'
import type { Article } from '../../../services/types';
// import ArticleCard from '../../../components/blog/ArticleCard'; // Temporarily commented
import MarkdownRenderer, { generateHeadingId } from '../../../components/ui/MarkdownRenderer';
import './ArticleDetail.css';

interface ArticleDetailProps {
    articleId: string;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ articleId }) => {
    // ===================================================================
    // A区 - 数据与状态：所有Hooks调用都放在最上面
    // ===================================================================

    const navigate = useNavigate();
    const [article, setArticle] = useState<Article | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
    const [tocBottomOffset, setTocBottomOffset] = useState<number>(0);
    const [activeHeading, setActiveHeading] = useState<string>(''); // 只用于点击高亮，不自动跟随
    const mountedRef = useRef(true);

    // 安全的状态更新函数
    const safeSetState = useCallback((updater: (prev: any) => any, setter: (value: any) => void) => {
        if (!mountedRef.current) return;
        setter(updater);
    }, []);

    // TOC底部偏移滚动监听
    useEffect(() => {
        const handleScroll = () => {
            if (!mountedRef.current) return;

            const scrollTop = window.pageYOffset;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollBottom = scrollTop + windowHeight;
            const distanceFromBottom = documentHeight - scrollBottom;

            const newTocOffset = distanceFromBottom <= 72 ? Math.max(0, 72 - distanceFromBottom) : 0;
            setTocBottomOffset(newTocOffset);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 文章数据加载
    useEffect(() => {
        mountedRef.current = true;
        loadArticle();

        return () => {
            mountedRef.current = false;
        };
    }, [articleId]);

    // ===================================================================
    // B区 - 核心逻辑：所有事件处理函数和业务逻辑
    // ===================================================================

    // 加载文章数据
    const loadArticle = useCallback(async () => {
        if (!mountedRef.current) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiService.getArticle(articleId);
            const fetchedArticle = response.success ? response.data : null;

            if (!mountedRef.current) return;

            if (fetchedArticle) {
                setArticle(fetchedArticle);

                // Load related articles (same category, excluding current article)
                if (fetchedArticle.category) {
                    const relatedResponse = await apiService.getArticles({
                        category: fetchedArticle.category,
                        status: 'published'
                    });

                    if (!mountedRef.current) return;

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
            if (!mountedRef.current) return;
            setError('Failed to load article');
            console.error('Error loading article:', err);
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [articleId]);

    // 从markdown内容提取标题 - 使用markdown-it准确解析
    const extractHeadings = useCallback((content: string) => {
        const md = new MarkdownIt();
        const tokens = md.parse(content, {});
        const headings = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.type === 'heading_open') {
                const level = parseInt(token.tag.substring(1)); // h1 -> 1, h2 -> 2, etc.
                const nextToken = tokens[i + 1];

                if (nextToken && nextToken.type === 'inline') {
                    const title = nextToken.content.trim();
                    // 使用与MarkdownRenderer相同的ID生成函数
                    const id = generateHeadingId(title);
                    headings.push({ level, title, id });
                }
            }
        }

        return headings;
    }, []);

    // 点击滚动功能 + 高亮设置
    const scrollToHeading = useCallback((headingId: string) => {
        const element = document.getElementById(headingId);
        if (!element) {
            console.warn(`Element with id "${headingId}" not found`);
            return;
        }

        // 设置点击的标题为高亮
        setActiveHeading(headingId);

        // 滚动到目标位置
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - 80; // 80px offset from top

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }, []);

    // 格式化日期
    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, []);

    // 计算阅读时间
    const calculateReadingTime = useCallback((content: string) => {
        const wordsPerMinute = 200;
        const words = content.split(/\s+/).length;
        const readingTime = Math.ceil(words / wordsPerMinute);
        return readingTime;
    }, []);

    // 处理相关文章点击
    const handleRelatedArticleClick = useCallback((relatedArticleId: string) => {
        navigate(`/article/${relatedArticleId}`);
    }, [navigate]);

    // 处理返回按钮点击
    const handleBackClick = useCallback(() => {
        navigate('/articles');
    }, [navigate]);

    // 计算衍生数据
    const headings = useMemo(() => {
        return article ? extractHeadings(article.content) : [];
    }, [article, extractHeadings]);

    const readingTime = useMemo(() => {
        return article ? calculateReadingTime(article.content) : 0;
    }, [article, calculateReadingTime]);

    const formattedDate = useMemo(() => {
        return article?.publishDate ? formatDate(article.publishDate) : '';
    }, [article?.publishDate, formatDate]);

    // ===================================================================
    // C区 - 渲染：纯声明式渲染
    // ===================================================================


    // 卫语句：加载状态
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

    // 卫语句：错误状态
    if (error || !article) {
        return (
            <div className="article-detail">
                <div className="article-error">
                    <md-icon className="error-icon">error_outline</md-icon>
                    <h2>Article Not Found</h2>
                    <p>{error || 'The article you\'re looking for doesn\'t exist.'}</p>
                    <md-filled-button onClick={handleBackClick}>
                        <md-icon slot="icon">arrow_back</md-icon>
                        Back to Articles
                    </md-filled-button>
                </div>
            </div>
        );
    }

    // 主要渲染

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
                                    className={`toc-item toc-level-${heading.level} ${activeHeading === heading.id ? 'active' : ''}`}
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
                        <span className="article-date">{formattedDate}</span>
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
                        <md-outlined-button onClick={handleBackClick}>
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
                                    onClick={() => handleRelatedArticleClick(relatedArticle.id)}
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

