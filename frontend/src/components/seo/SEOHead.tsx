import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
    type?: 'website' | 'article';
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    tags?: string[];
    category?: string;
    readingTime?: number;
}

const SEOHead: React.FC<SEOHeadProps> = ({
    title = "Chuyi的博客 - 现代化个人博客",
    description = "欢迎来到Chuyi的个人博客，分享技术文章、生活感悟和创意思考。探索编程、设计、科技等多元化内容。",
    keywords = ["博客", "技术", "编程", "设计", "科技", "Chuyi", "个人博客", "前端开发", "全栈开发"],
    image = "/logo.jpg",
    url,
    type = 'website',
    author = "Chuyi",
    publishedTime,
    modifiedTime,
    tags = [],
    category,
    readingTime
}) => {
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://blog.chuyi.uk');
    const siteTitle = "Chuyi的博客";
    const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;

    // 合并关键词
    const allKeywords = [...keywords, ...tags].join(', ');

    // 构建结构化数据
    const structuredData = {
        "@context": "https://schema.org",
        "@type": type === 'article' ? "BlogPosting" : "WebSite",
        "name": fullTitle,
        "headline": title,
        "description": description,
        "url": currentUrl,
        "author": {
            "@type": "Person",
            "name": author,
            "url": "https://blog.chuyi.uk/about"
        },
        "publisher": {
            "@type": "Organization",
            "name": siteTitle,
            "url": "https://blog.chuyi.uk",
            "logo": {
                "@type": "ImageObject",
                "url": "https://blog.chuyi.uk/logo.jpg",
                "width": 400,
                "height": 400
            }
        },
        "image": {
            "@type": "ImageObject",
            "url": image.startsWith('http') ? image : `https://blog.chuyi.uk${image}`,
            "width": 1200,
            "height": 630
        },
        "datePublished": publishedTime,
        "dateModified": modifiedTime || publishedTime,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": currentUrl
        }
    };

    // 如果是文章类型，添加额外的文章相关字段
    if (type === 'article') {
        Object.assign(structuredData, {
            "articleSection": category,
            "keywords": allKeywords,
            "wordCount": readingTime ? readingTime * 200 : undefined, // 估算字数
            "timeRequired": readingTime ? `PT${readingTime}M` : undefined,
            "inLanguage": "zh-CN"
        });
    }

    // 如果是网站首页，添加网站搜索功能
    if (type === 'website' && currentUrl === 'https://blog.chuyi.uk') {
        structuredData["potentialAction"] = {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://blog.chuyi.uk/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
        };
    }

    return (
        <Helmet>
            {/* 基础 Meta 标签 */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={allKeywords} />
            <meta name="author" content={author} />

            {/* 语言和地区 */}
            <meta name="language" content="zh-CN" />
            <html lang="zh-CN" />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image.startsWith('http') ? image : `https://blog.chuyi.uk${image}`} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:site_name" content={siteTitle} />
            <meta property="og:locale" content="zh_CN" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image.startsWith('http') ? image : `https://blog.chuyi.uk${image}`} />
            <meta name="twitter:creator" content="@chuyi" />
            <meta name="twitter:site" content="@chuyi" />

            {/* 文章特定的 Meta 标签 */}
            {type === 'article' && publishedTime && (
                <meta property="article:published_time" content={publishedTime} />
            )}
            {type === 'article' && modifiedTime && (
                <meta property="article:modified_time" content={modifiedTime} />
            )}
            {type === 'article' && author && (
                <meta property="article:author" content={author} />
            )}
            {type === 'article' && category && (
                <meta property="article:section" content={category} />
            )}
            {type === 'article' && tags.map(tag => (
                <meta key={tag} property="article:tag" content={tag} />
            ))}

            {/* 搜索引擎优化 */}
            <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
            <meta name="googlebot" content="index, follow" />
            <meta name="bingbot" content="index, follow" />

            {/* 规范链接 */}
            <link rel="canonical" href={currentUrl} />

            {/* RSS Feed */}
            <link rel="alternate" type="application/rss+xml" title={`${siteTitle} RSS Feed`} href="https://blog.chuyi.uk/api/rss" />

            {/* Favicon 和 App Icons */}
            <link rel="icon" type="image/jpeg" href="/logo.jpg" />
            <link rel="apple-touch-icon" sizes="180x180" href="/logo.jpg" />
            <link rel="icon" type="image/jpeg" sizes="32x32" href="/logo.jpg" />
            <link rel="icon" type="image/jpeg" sizes="16x16" href="/logo.jpg" />
            <link rel="manifest" href="/site.webmanifest" />

            {/* 结构化数据 */}
            <script type="application/ld+json">
                {JSON.stringify(structuredData, null, 2)}
            </script>

            {/* 性能和安全 */}
            <meta name="theme-color" content="#6366f1" />
            <meta name="color-scheme" content="light dark" />
            <meta name="format-detection" content="telephone=no" />

            {/* PWA相关 */}
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content={siteTitle} />

            {/* 预连接重要域名 */}
            <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="dns-prefetch" href="https://blog.chuyi.uk" />
        </Helmet>
    );
};

export default SEOHead;
