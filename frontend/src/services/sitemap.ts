// Sitemap generation service
import { apiService } from './api';
import type { Article } from './types';

interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}

class SitemapService {
    private baseUrl = 'https://blog.chuyi.uk';

    /**
     * 生成完整的站点地图XML
     */
    async generateSitemap(): Promise<string> {
        const urls = await this.getAllUrls();

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => this.formatSitemapUrl(url)).join('\n')}
</urlset>`;

        return xml;
    }

    /**
     * 获取所有需要包含在站点地图中的URL
     */
    private async getAllUrls(): Promise<SitemapUrl[]> {
        const urls: SitemapUrl[] = [];

        // 静态页面
        urls.push(...this.getStaticUrls());

        // 文章页面
        try {
            const articlesResponse = await apiService.getPosts({ status: 'published' });
            if (articlesResponse.success && articlesResponse.data) {
                const articles = Array.isArray(articlesResponse.data) ? articlesResponse.data : (articlesResponse.data as any).posts || [];
                urls.push(...this.getArticleUrls(articles));
            }
        } catch (error) {
            console.error('Failed to fetch articles for sitemap:', error);
        }

        // 分类页面
        try {
            const categoriesResponse = await apiService.getPublicCategories();
            if (categoriesResponse.success && categoriesResponse.data) {
                urls.push(...this.getCategoryUrls(categoriesResponse.data));
            }
        } catch (error) {
            console.error('Failed to fetch categories for sitemap:', error);
        }

        // 标签页面
        try {
            const tagsResponse = await apiService.getPublicTags();
            if (tagsResponse.success && tagsResponse.data) {
                urls.push(...this.getTagUrls(tagsResponse.data));
            }
        } catch (error) {
            console.error('Failed to fetch tags for sitemap:', error);
        }

        return urls;
    }

    /**
     * 获取静态页面URL
     */
    private getStaticUrls(): SitemapUrl[] {
        return [
            {
                loc: this.baseUrl,
                changefreq: 'daily',
                priority: 1.0,
                lastmod: new Date().toISOString().split('T')[0]
            },
            {
                loc: `${this.baseUrl}/articles`,
                changefreq: 'daily',
                priority: 0.9,
                lastmod: new Date().toISOString().split('T')[0]
            },
            {
                loc: `${this.baseUrl}/about`,
                changefreq: 'monthly',
                priority: 0.7,
                lastmod: new Date().toISOString().split('T')[0]
            },
            {
                loc: `${this.baseUrl}/contact`,
                changefreq: 'monthly',
                priority: 0.6,
                lastmod: new Date().toISOString().split('T')[0]
            }
        ];
    }

    /**
     * 获取文章页面URL
     */
    private getArticleUrls(articles: Article[]): SitemapUrl[] {
        return articles.map(article => ({
            loc: `${this.baseUrl}/article/${article.id}`,
            changefreq: 'weekly' as const,
            priority: 0.8,
            lastmod: (article as any).updatedAt || article.publishDate || (article as any).createdAt
        }));
    }

    /**
     * 获取分类页面URL
     */
    private getCategoryUrls(categories: any[]): SitemapUrl[] {
        return categories.map(category => ({
            loc: `${this.baseUrl}/category/${category.id}`,
            changefreq: 'weekly' as const,
            priority: 0.6,
            lastmod: new Date().toISOString().split('T')[0]
        }));
    }

    /**
     * 获取标签页面URL
     */
    private getTagUrls(tags: any[]): SitemapUrl[] {
        return tags.map(tag => ({
            loc: `${this.baseUrl}/tag/${tag.id}`,
            changefreq: 'weekly' as const,
            priority: 0.5,
            lastmod: new Date().toISOString().split('T')[0]
        }));
    }

    /**
     * 格式化单个URL为XML格式
     */
    private formatSitemapUrl(url: SitemapUrl): string {
        let xml = `  <url>
    <loc>${url.loc}</loc>`;

        if (url.lastmod) {
            xml += `
    <lastmod>${url.lastmod}</lastmod>`;
        }

        if (url.changefreq) {
            xml += `
    <changefreq>${url.changefreq}</changefreq>`;
        }

        if (url.priority !== undefined) {
            xml += `
    <priority>${url.priority}</priority>`;
        }

        xml += `
  </url>`;

        return xml;
    }

    /**
     * 生成RSS Feed XML
     */
    async generateRSSFeed(): Promise<string> {
        try {
            const articlesResponse = await apiService.getPosts({
                status: 'published',
                page_size: 20
            });

            if (!articlesResponse.success || !articlesResponse.data) {
                throw new Error('Failed to fetch articles for RSS');
            }

            const articles = Array.isArray(articlesResponse.data) ? articlesResponse.data : (articlesResponse.data as any).posts || [];
            const buildDate = new Date().toUTCString();

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Chuyi的博客</title>
    <link>${this.baseUrl}</link>
    <description>欢迎来到Chuyi的个人博客，分享技术文章、生活感悟和创意思考。</description>
    <language>zh-cn</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${this.baseUrl}/api/rss" rel="self" type="application/rss+xml"/>
    <generator>Chuyi Blog System</generator>
    <webMaster>admin@chuyi.uk (Chuyi)</webMaster>
    <managingEditor>admin@chuyi.uk (Chuyi)</managingEditor>
    <copyright>Copyright ${new Date().getFullYear()} Chuyi. All rights reserved.</copyright>
    <category>Technology</category>
    <category>Programming</category>
    <category>Personal Blog</category>
${articles.map(article => this.formatRSSItem(article)).join('\n')}
  </channel>
</rss>`;

            return xml;
        } catch (error) {
            console.error('Failed to generate RSS feed:', error);
            throw error;
        }
    }

    /**
     * 格式化单个RSS项目
     */
    private formatRSSItem(article: Article): string {
        const pubDate = article.publishDate
            ? new Date(article.publishDate).toUTCString()
            : new Date((article as any).createdAt || Date.now()).toUTCString();

        const description = article.excerpt ||
            (article.content ? article.content.substring(0, 200) + '...' : '');

        return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${this.baseUrl}/article/${article.id}</link>
      <guid isPermaLink="true">${this.baseUrl}/article/${article.id}</guid>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>admin@chuyi.uk (Chuyi)</author>
      ${article.category ? `<category><![CDATA[${article.category}]]></category>` : ''}
    </item>`;
    }
}

export const sitemapService = new SitemapService();
export default sitemapService;
