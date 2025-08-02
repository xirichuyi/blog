/**
 * 代码质量检查工具
 */

import { performanceMonitor } from './performance';

// 代码质量指标
interface QualityMetrics {
  performance: {
    pageLoadTime: number;
    componentRenderTime: number;
    memoryUsage: number;
    apiResponseTime: number;
  };
  errors: {
    jsErrors: number;
    networkErrors: number;
    renderErrors: number;
  };
  accessibility: {
    score: number;
    issues: string[];
  };
  seo: {
    score: number;
    issues: string[];
  };
  bestPractices: {
    score: number;
    issues: string[];
  };
}

// 质量检查器
class CodeQualityChecker {
  private metrics: Partial<QualityMetrics> = {};

  /**
   * 检查性能指标
   */
  checkPerformance(): QualityMetrics['performance'] {
    const pageLoadStats = performanceMonitor.getStats('page_load');
    const componentRenderStats = performanceMonitor.getStats('component_render');
    const memoryStats = performanceMonitor.getStats('memory_usage');
    const apiStats = performanceMonitor.getStats('api_response');

    return {
      pageLoadTime: pageLoadStats?.latest || 0,
      componentRenderTime: componentRenderStats?.avg || 0,
      memoryUsage: memoryStats?.latest || 0,
      apiResponseTime: apiStats?.avg || 0,
    };
  }

  /**
   * 检查可访问性
   */
  checkAccessibility(): QualityMetrics['accessibility'] {
    const issues: string[] = [];
    let score = 100;

    // 检查图片alt属性
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt) {
        issues.push(`Image ${index + 1} missing alt attribute`);
        score -= 5;
      }
    });

    // 检查表单标签
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input, index) => {
      const id = input.getAttribute('id');
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      if (!label && !input.getAttribute('aria-label')) {
        issues.push(`Form element ${index + 1} missing label`);
        score -= 5;
      }
    });

    // 检查标题层级
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        issues.push(`Heading level skip detected at heading ${index + 1}`);
        score -= 3;
      }
      lastLevel = level;
    });

    // 检查颜色对比度（简化版）
    const elements = document.querySelectorAll('*');
    elements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // 简单的对比度检查（实际应用中需要更复杂的算法）
      if (color === backgroundColor) {
        issues.push(`Poor color contrast detected at element ${index + 1}`);
        score -= 2;
      }
    });

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * 检查SEO
   */
  checkSEO(): QualityMetrics['seo'] {
    const issues: string[] = [];
    let score = 100;

    // 检查title标签
    const title = document.querySelector('title');
    if (!title || !title.textContent?.trim()) {
      issues.push('Missing or empty title tag');
      score -= 20;
    } else if (title.textContent.length > 60) {
      issues.push('Title tag too long (>60 characters)');
      score -= 10;
    }

    // 检查meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription || !metaDescription.getAttribute('content')?.trim()) {
      issues.push('Missing or empty meta description');
      score -= 15;
    }

    // 检查h1标签
    const h1Tags = document.querySelectorAll('h1');
    if (h1Tags.length === 0) {
      issues.push('Missing h1 tag');
      score -= 15;
    } else if (h1Tags.length > 1) {
      issues.push('Multiple h1 tags found');
      score -= 10;
    }

    // 检查canonical链接
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      issues.push('Missing canonical link');
      score -= 10;
    }

    // 检查Open Graph标签
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogTitle || !ogDescription) {
      issues.push('Missing Open Graph tags');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * 检查最佳实践
   */
  checkBestPractices(): QualityMetrics['bestPractices'] {
    const issues: string[] = [];
    let score = 100;

    // 检查HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('Site not served over HTTPS');
      score -= 20;
    }

    // 检查控制台错误
    const originalConsoleError = console.error;
    let errorCount = 0;
    console.error = (...args) => {
      errorCount++;
      originalConsoleError.apply(console, args);
    };

    setTimeout(() => {
      console.error = originalConsoleError;
      if (errorCount > 0) {
        issues.push(`${errorCount} console errors detected`);
        score -= errorCount * 5;
      }
    }, 1000);

    // 检查外部链接
    const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="' + location.hostname + '"])');
    externalLinks.forEach((link, index) => {
      if (!link.getAttribute('rel')?.includes('noopener')) {
        issues.push(`External link ${index + 1} missing rel="noopener"`);
        score -= 2;
      }
    });

    // 检查图片优化
    const largeImages = document.querySelectorAll('img');
    largeImages.forEach((img, index) => {
      if (img.naturalWidth > 1920 || img.naturalHeight > 1080) {
        issues.push(`Image ${index + 1} may be too large for web`);
        score -= 3;
      }
    });

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * 运行完整的质量检查
   */
  async runFullCheck(): Promise<QualityMetrics> {
    const metrics: QualityMetrics = {
      performance: this.checkPerformance(),
      errors: {
        jsErrors: 0,
        networkErrors: 0,
        renderErrors: 0,
      },
      accessibility: this.checkAccessibility(),
      seo: this.checkSEO(),
      bestPractices: this.checkBestPractices(),
    };

    this.metrics = metrics;
    return metrics;
  }

  /**
   * 获取质量评分
   */
  getOverallScore(): number {
    if (!this.metrics.performance) return 0;

    const weights = {
      performance: 0.3,
      accessibility: 0.25,
      seo: 0.25,
      bestPractices: 0.2,
    };

    let totalScore = 0;
    let totalWeight = 0;

    if (this.metrics.accessibility) {
      totalScore += this.metrics.accessibility.score * weights.accessibility;
      totalWeight += weights.accessibility;
    }

    if (this.metrics.seo) {
      totalScore += this.metrics.seo.score * weights.seo;
      totalWeight += weights.seo;
    }

    if (this.metrics.bestPractices) {
      totalScore += this.metrics.bestPractices.score * weights.bestPractices;
      totalWeight += weights.bestPractices;
    }

    // 性能评分基于阈值
    const perfScore = this.calculatePerformanceScore();
    totalScore += perfScore * weights.performance;
    totalWeight += weights.performance;

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * 计算性能评分
   */
  private calculatePerformanceScore(): number {
    if (!this.metrics.performance) return 0;

    const { pageLoadTime, componentRenderTime, memoryUsage, apiResponseTime } = this.metrics.performance;
    
    let score = 100;

    // 页面加载时间评分
    if (pageLoadTime > 3000) score -= 20;
    else if (pageLoadTime > 2000) score -= 10;

    // 组件渲染时间评分
    if (componentRenderTime > 16) score -= 15;
    else if (componentRenderTime > 10) score -= 8;

    // 内存使用评分
    if (memoryUsage > 100) score -= 15;
    else if (memoryUsage > 50) score -= 8;

    // API响应时间评分
    if (apiResponseTime > 2000) score -= 15;
    else if (apiResponseTime > 1000) score -= 8;

    return Math.max(0, score);
  }

  /**
   * 生成质量报告
   */
  generateReport(): string {
    const score = this.getOverallScore();
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    
    let report = `Code Quality Report\n`;
    report += `==================\n`;
    report += `Overall Score: ${score}/100 (Grade: ${grade})\n\n`;

    if (this.metrics.performance) {
      report += `Performance:\n`;
      report += `- Page Load Time: ${this.metrics.performance.pageLoadTime}ms\n`;
      report += `- Component Render Time: ${this.metrics.performance.componentRenderTime}ms\n`;
      report += `- Memory Usage: ${this.metrics.performance.memoryUsage}MB\n`;
      report += `- API Response Time: ${this.metrics.performance.apiResponseTime}ms\n\n`;
    }

    if (this.metrics.accessibility) {
      report += `Accessibility: ${this.metrics.accessibility.score}/100\n`;
      if (this.metrics.accessibility.issues.length > 0) {
        report += `Issues:\n${this.metrics.accessibility.issues.map(issue => `- ${issue}`).join('\n')}\n`;
      }
      report += '\n';
    }

    if (this.metrics.seo) {
      report += `SEO: ${this.metrics.seo.score}/100\n`;
      if (this.metrics.seo.issues.length > 0) {
        report += `Issues:\n${this.metrics.seo.issues.map(issue => `- ${issue}`).join('\n')}\n`;
      }
      report += '\n';
    }

    if (this.metrics.bestPractices) {
      report += `Best Practices: ${this.metrics.bestPractices.score}/100\n`;
      if (this.metrics.bestPractices.issues.length > 0) {
        report += `Issues:\n${this.metrics.bestPractices.issues.map(issue => `- ${issue}`).join('\n')}\n`;
      }
    }

    return report;
  }
}

// 创建全局实例
export const codeQualityChecker = new CodeQualityChecker();

// 自动质量检查（在开发环境中）
if (process.env.NODE_ENV === 'development') {
  // 页面加载完成后运行质量检查
  window.addEventListener('load', () => {
    setTimeout(async () => {
      try {
        await codeQualityChecker.runFullCheck();
        const report = codeQualityChecker.generateReport();
        console.group('🔍 Code Quality Report');
        console.log(report);
        console.groupEnd();
      } catch (error) {
        console.warn('Quality check failed:', error);
      }
    }, 2000);
  });
}

export default codeQualityChecker;
