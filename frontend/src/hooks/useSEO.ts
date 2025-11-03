import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOData {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
    type?: 'website' | 'article';
}

/**
 * 用于管理页面SEO的自定义钩子
 */
export const useSEO = (seoData: SEOData) => {
    const location = useLocation();

    useEffect(() => {
        // 更新页面标题
        if (seoData.title) {
            document.title = seoData.title.includes('Chuyi的博客')
                ? seoData.title
                : `${seoData.title} | Chuyi的博客`;
        }

        // 更新meta描述
        if (seoData.description) {
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', seoData.description);
        }

        // 更新关键词
        if (seoData.keywords && seoData.keywords.length > 0) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
                metaKeywords = document.createElement('meta');
                metaKeywords.setAttribute('name', 'keywords');
                document.head.appendChild(metaKeywords);
            }
            metaKeywords.setAttribute('content', seoData.keywords.join(', '));
        }

        // 更新规范链接
        const currentUrl = seoData.url || `https://blog.chuyi.uk${location.pathname}`;
        let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.href = currentUrl;

        // 更新Open Graph标签
        updateMetaProperty('og:title', seoData.title || document.title);
        updateMetaProperty('og:description', seoData.description || '');
        updateMetaProperty('og:url', currentUrl);
        updateMetaProperty('og:type', seoData.type || 'website');

        if (seoData.image) {
            const imageUrl = seoData.image.startsWith('http')
                ? seoData.image
                : `https://blog.chuyi.uk${seoData.image}`;
            updateMetaProperty('og:image', imageUrl);
        }

        // 更新Twitter Card标签
        updateMetaName('twitter:title', seoData.title || document.title);
        updateMetaName('twitter:description', seoData.description || '');

        if (seoData.image) {
            const imageUrl = seoData.image.startsWith('http')
                ? seoData.image
                : `https://blog.chuyi.uk${seoData.image}`;
            updateMetaName('twitter:image', imageUrl);
        }

    }, [seoData, location.pathname]);
};

/**
 * 更新或创建meta property标签
 */
function updateMetaProperty(property: string, content: string) {
    if (!content) return;

    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
}

/**
 * 更新或创建meta name标签
 */
function updateMetaName(name: string, content: string) {
    if (!content) return;

    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
}

/**
 * 生成面包屑导航的结构化数据
 */
export const generateBreadcrumbStructuredData = (breadcrumbs: Array<{ name: string, url: string }>) => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
        }))
    };

    // 移除现有的面包屑结构化数据
    const existingScript = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
    if (existingScript) {
        existingScript.remove();
    }

    // 添加新的结构化数据
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-breadcrumb', 'true');
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
};

export default useSEO;


