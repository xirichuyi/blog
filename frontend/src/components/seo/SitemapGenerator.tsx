import React, { useState } from 'react';
import { sitemapService } from '../../services/sitemap';
import { useNotification } from '../../contexts/NotificationContext';

const SitemapGenerator: React.FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [sitemapContent, setSitemapContent] = useState<string>('');
    const [rssContent, setRssContent] = useState<string>('');
    const { showNotification } = useNotification();

    const generateSitemap = async () => {
        try {
            setIsGenerating(true);
            const sitemap = await sitemapService.generateSitemap();
            setSitemapContent(sitemap);

            showNotification({
                type: 'success',
                title: '站点地图生成成功',
                message: '站点地图已成功生成，您可以将其保存为sitemap.xml文件。',
            });
        } catch (error) {
            console.error('Failed to generate sitemap:', error);
            showNotification({
                type: 'error',
                title: '站点地图生成失败',
                message: error instanceof Error ? error.message : '生成站点地图时发生错误',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const generateRSS = async () => {
        try {
            setIsGenerating(true);
            const rss = await sitemapService.generateRSSFeed();
            setRssContent(rss);

            showNotification({
                type: 'success',
                title: 'RSS Feed生成成功',
                message: 'RSS Feed已成功生成，您可以将其保存为rss.xml文件。',
            });
        } catch (error) {
            console.error('Failed to generate RSS:', error);
            showNotification({
                type: 'error',
                title: 'RSS Feed生成失败',
                message: error instanceof Error ? error.message : '生成RSS Feed时发生错误',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadSitemap = () => {
        if (!sitemapContent) return;

        const blob = new Blob([sitemapContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadRSS = () => {
        if (!rssContent) return;

        const blob = new Blob([rssContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rss.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copySitemapToClipboard = async () => {
        if (!sitemapContent) return;

        try {
            await navigator.clipboard.writeText(sitemapContent);
            showNotification({
                type: 'success',
                title: '复制成功',
                message: '站点地图内容已复制到剪贴板',
            });
        } catch (error) {
            showNotification({
                type: 'error',
                title: '复制失败',
                message: '无法复制到剪贴板，请手动复制',
            });
        }
    };

    return (
        <div className="sitemap-generator" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="generator-header" style={{ marginBottom: '32px' }}>
                <h1 className="md-typescale-headline-medium">SEO工具 - 站点地图生成器</h1>
                <p className="md-typescale-body-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                    生成站点地图和RSS Feed，提升搜索引擎优化效果
                </p>
            </div>

            <div className="generator-actions" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
            }}>
                <div className="action-card" style={{
                    background: 'var(--md-sys-color-surface-container-low)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid var(--md-sys-color-outline-variant)'
                }}>
                    <h3 className="md-typescale-title-medium" style={{ marginBottom: '16px' }}>
                        站点地图 (Sitemap)
                    </h3>
                    <p className="md-typescale-body-small" style={{
                        marginBottom: '20px',
                        color: 'var(--md-sys-color-on-surface-variant)'
                    }}>
                        生成包含所有页面、文章、分类和标签的XML站点地图
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <md-filled-button onClick={generateSitemap} {...(isGenerating ? { disabled: true } : {})}>
                            <md-icon slot="icon">map</md-icon>
                            {isGenerating ? '生成中...' : '生成站点地图'}
                        </md-filled-button>
                        {sitemapContent && (
                            <>
                                <md-outlined-button onClick={downloadSitemap}>
                                    <md-icon slot="icon">download</md-icon>
                                    下载
                                </md-outlined-button>
                                <md-text-button onClick={copySitemapToClipboard}>
                                    <md-icon slot="icon">content_copy</md-icon>
                                    复制
                                </md-text-button>
                            </>
                        )}
                    </div>
                </div>

                <div className="action-card" style={{
                    background: 'var(--md-sys-color-surface-container-low)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid var(--md-sys-color-outline-variant)'
                }}>
                    <h3 className="md-typescale-title-medium" style={{ marginBottom: '16px' }}>
                        RSS Feed
                    </h3>
                    <p className="md-typescale-body-small" style={{
                        marginBottom: '20px',
                        color: 'var(--md-sys-color-on-surface-variant)'
                    }}>
                        生成最新文章的RSS订阅源
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <md-filled-button onClick={generateRSS} {...(isGenerating ? { disabled: true } : {})}>
                            <md-icon slot="icon">rss_feed</md-icon>
                            {isGenerating ? '生成中...' : '生成RSS'}
                        </md-filled-button>
                        {rssContent && (
                            <>
                                <md-outlined-button onClick={downloadRSS}>
                                    <md-icon slot="icon">download</md-icon>
                                    下载
                                </md-outlined-button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {sitemapContent && (
                <div className="sitemap-preview" style={{ marginBottom: '24px' }}>
                    <h3 className="md-typescale-title-medium" style={{ marginBottom: '16px' }}>
                        站点地图预览
                    </h3>
                    <div style={{
                        background: 'var(--md-sys-color-surface-container-lowest)',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                        borderRadius: '12px',
                        padding: '16px',
                        maxHeight: '400px',
                        overflow: 'auto'
                    }}>
                        <pre style={{
                            margin: 0,
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: 'var(--md-sys-color-on-surface)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}>
                            {sitemapContent}
                        </pre>
                    </div>
                </div>
            )}

            <div className="seo-tips" style={{
                background: 'var(--md-sys-color-primary-container)',
                borderRadius: '16px',
                padding: '24px',
                marginTop: '32px'
            }}>
                <h3 className="md-typescale-title-medium" style={{
                    marginBottom: '16px',
                    color: 'var(--md-sys-color-on-primary-container)'
                }}>
                    SEO优化建议
                </h3>
                <ul style={{
                    margin: 0,
                    paddingLeft: '20px',
                    color: 'var(--md-sys-color-on-primary-container)'
                }}>
                    <li>将生成的sitemap.xml文件上传到网站根目录</li>
                    <li>在Google Search Console中提交站点地图</li>
                    <li>确保robots.txt文件包含站点地图链接</li>
                    <li>定期更新站点地图，特别是发布新内容后</li>
                    <li>监控Google Search Console中的索引状态</li>
                    <li>使用结构化数据增强搜索结果展示</li>
                </ul>
            </div>
        </div>
    );
};

export default SitemapGenerator;
