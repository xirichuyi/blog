import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownIt from 'markdown-it';
import { apiService } from '../../../services/api'
import type { Article } from '../../../services/types';
// import ArticleCard from '../../../components/blog/ArticleCard'; // Temporarily commented
import MarkdownRenderer, { generateHeadingId } from '../../../components/ui/MarkdownRenderer';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Card } from '@/components/ui/shadcn/card';
import { Separator } from '@/components/ui/shadcn/separator';
import { cn } from '@/lib/utils';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

interface ArticleDetailProps {
    articleId?: string;
    article?: Article;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ articleId, article: initialArticle }) => {
    // ===================================================================
    // A区 - 数据与状态：所有Hooks调用都放在最上面
    // ===================================================================

    const navigate = useNavigate();
    const [article, setArticle] = useState<Article | null>(initialArticle || null);
    const [isLoading, setIsLoading] = useState(!initialArticle);
    const [error, setError] = useState<string | null>(null);
    const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
    const [tocBottomOffset, setTocBottomOffset] = useState<number>(0);
    const [activeHeading, setActiveHeading] = useState<string>(''); // 只用于点击高亮，不自动跟随
    const [imageLoaded, setImageLoaded] = useState<boolean>(false);
    const [imageError, setImageError] = useState<boolean>(false);
    const mountedRef = useRef(true);
    const imageRef = useRef<HTMLImageElement>(null);

    // ===================================================================
    // B区 - 核心逻辑：所有事件处理函数和业务逻辑
    // ===================================================================

    // 加载文章数据
    const loadArticle = useCallback(async () => {
        if (!mountedRef.current || !articleId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiService.getArticle(articleId);
            
            if (!mountedRef.current) return;

            if (response.success && response.data) {
                const fetchedArticle = response.data;
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
                setError(response.error || 'Article not found');
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
        
        // 如果已经有了传入的文章数据，且 ID 匹配，则不需要重新加载
        if (initialArticle && (initialArticle.id === articleId || !articleId)) {
            setArticle(initialArticle);
            setIsLoading(false);
        } else if (articleId) {
            loadArticle();
        }

        return () => {
            mountedRef.current = false;
        };
    }, [articleId, initialArticle, loadArticle]);

    // 重置图片加载状态当文章改变时
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [article?.id]);

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

    // 处理图片加载完成
    const handleImageLoad = useCallback(() => {
        if (!mountedRef.current) return;
        setImageLoaded(true);
        setImageError(false);
    }, []);

    // 处理图片加载错误
    const handleImageError = useCallback(() => {
        if (!mountedRef.current) return;
        setImageLoaded(true);
        setImageError(true);
    }, []);

    // 计算衍生数据
    const headings = useMemo(() => {
        return article?.content ? extractHeadings(article.content) : [];
    }, [article, extractHeadings]);

    const readingTime = useMemo(() => {
        return article?.content ? calculateReadingTime(article.content) : 0;
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
            <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-24 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" /> Loading article…
            </div>
        );
    }

    // 卫语句：错误状态
    if (error || !article) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
                <AlertCircle className="size-12 text-destructive" />
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Article Not Found</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {error || "The article you're looking for doesn't exist."}
                    </p>
                </div>
                <Button onClick={handleBackClick}>
                    <ArrowLeft />
                    Back to Articles
                </Button>
            </div>
        );
    }

    // 主要渲染
    return (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <div className={cn('grid grid-cols-1 gap-10', headings.length > 0 && 'lg:grid-cols-[220px_1fr]')}>
                {/* Table of Contents Sidebar */}
                {headings.length > 0 && (
                    <aside className="hidden lg:block">
                        <div className="sticky top-24">
                            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Table of Contents
                            </h3>
                            <nav className="space-y-1 border-l border-border">
                                {headings.map((heading, index) => (
                                    <button
                                        key={index}
                                        onClick={() => scrollToHeading(heading.id)}
                                        className={cn(
                                            '-ml-px block w-full border-l-2 py-1 pl-3 text-left text-sm transition-colors',
                                            activeHeading === heading.id
                                                ? 'border-primary font-medium text-foreground'
                                                : 'border-transparent text-muted-foreground hover:text-foreground',
                                            heading.level >= 3 && 'pl-6'
                                        )}
                                    >
                                        {heading.title}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>
                )}

                <article className="min-w-0">
                    {/* Article Header */}
                    <header className="mb-8">
                        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <Badge variant="secondary">{article.category}</Badge>
                            <span>{formattedDate}</span>
                            <span>·</span>
                            <span>{readingTime} min read</span>
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight text-foreground">{article.title}</h1>

                        {article.excerpt && (
                            <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>
                        )}

                        {article.tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {article.tags.map((tag, index) => (
                                    <Badge key={index} variant="outline">{tag}</Badge>
                                ))}
                            </div>
                        )}

                        {/* Article Image */}
                        {(article.coverImage || article.imageUrl) && !imageError && (
                            <div className="mt-6 overflow-hidden rounded-xl border border-border">
                                <img
                                    ref={imageRef}
                                    src={article.coverImage || article.imageUrl}
                                    alt={article.title}
                                    onLoad={handleImageLoad}
                                    onError={handleImageError}
                                    className="w-full object-cover"
                                    style={{
                                        opacity: imageLoaded && !imageError ? 1 : 0,
                                        transition: 'opacity 0.3s ease-in-out'
                                    }}
                                />
                            </div>
                        )}
                    </header>

                    <Separator className="my-8" />

                    {/* Article Content */}
                    <MarkdownRenderer content={article.content || ''} />

                    {/* Article Footer */}
                    <Separator className="my-8" />
                    <Button variant="outline" onClick={handleBackClick}>
                        <ArrowLeft />
                        Back to Articles
                    </Button>

                    {/* Related Articles */}
                    {relatedArticles.length > 0 && (
                        <section className="mt-12">
                            <h2 className="mb-4 text-xl font-semibold text-foreground">Related Articles</h2>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {relatedArticles.map((relatedArticle) => (
                                    <Card
                                        key={relatedArticle.id}
                                        onClick={() => handleRelatedArticleClick(relatedArticle.id)}
                                        className="cursor-pointer p-4 transition-colors hover:bg-accent"
                                    >
                                        <h3 className="line-clamp-1 font-medium text-foreground">{relatedArticle.title}</h3>
                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{relatedArticle.excerpt}</p>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}
                </article>
            </div>
        </div>
    );
};

export default ArticleDetail;

