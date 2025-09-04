// Bundle size analysis utility for performance monitoring

export interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  chunkSizes: { [key: string]: number };
  assetSizes: { [key: string]: number };
  duplicateModules: string[];
  largeModules: { name: string; size: number }[];
}

class BundleAnalyzer {
  private stats: BundleStats = {
    totalSize: 0,
    gzippedSize: 0,
    chunkSizes: {},
    assetSizes: {},
    duplicateModules: [],
    largeModules: []
  };

  // Analyze current bundle (development mode approximation)
  async analyzeCurrent(): Promise<BundleStats> {
    if (process.env.NODE_ENV !== 'development') {
      return this.stats;
    }

    try {
      // Get performance navigation timing for initial bundle size estimation
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // Estimate total transfer size
        this.stats.totalSize = navigation.transferSize || 0;
        this.stats.gzippedSize = Math.round(this.stats.totalSize * 0.7); // Rough gzip estimate
      }

      // Analyze resource sizes
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      resources.forEach(resource => {
        const url = new URL(resource.name);
        const filename = url.pathname.split('/').pop() || 'unknown';
        
        if (resource.transferSize) {
          if (filename.endsWith('.js')) {
            this.stats.chunkSizes[filename] = resource.transferSize;
          } else if (filename.endsWith('.css') || filename.endsWith('.png') || filename.endsWith('.jpg')) {
            this.stats.assetSizes[filename] = resource.transferSize;
          }
        }
      });

      // Identify large modules (> 100KB)
      this.stats.largeModules = Object.entries(this.stats.chunkSizes)
        .filter(([_, size]) => size > 100 * 1024)
        .map(([name, size]) => ({ name, size }))
        .sort((a, b) => b.size - a.size);

      return this.stats;
    } catch (error) {
      console.warn('Bundle analysis failed:', error);
      return this.stats;
    }
  }

  // Get bundle recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check total bundle size
    if (this.stats.totalSize > 1024 * 1024) { // > 1MB
      recommendations.push('Consider code splitting - total bundle size is over 1MB');
    }

    // Check for large chunks
    const largeChunks = Object.entries(this.stats.chunkSizes)
      .filter(([_, size]) => size > 500 * 1024); // > 500KB

    if (largeChunks.length > 0) {
      recommendations.push(`Large chunks detected: ${largeChunks.map(([name]) => name).join(', ')}`);
    }

    // Check for duplicate modules
    if (this.stats.duplicateModules.length > 0) {
      recommendations.push(`Duplicate modules found: ${this.stats.duplicateModules.join(', ')}`);
    }

    // Check for unused assets
    const unusedAssets = Object.entries(this.stats.assetSizes)
      .filter(([name, size]) => size > 50 * 1024 && !document.querySelector(`[src*="${name}"]`));

    if (unusedAssets.length > 0) {
      recommendations.push(`Potentially unused assets: ${unusedAssets.map(([name]) => name).join(', ')}`);
    }

    return recommendations;
  }

  // Format size for display
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get performance score based on bundle size
  getPerformanceScore(): number {
    const totalSizeKB = this.stats.totalSize / 1024;
    
    if (totalSizeKB < 200) return 100; // Excellent
    if (totalSizeKB < 500) return 80;  // Good
    if (totalSizeKB < 1000) return 60; // Fair
    if (totalSizeKB < 2000) return 40; // Poor
    return 20; // Very Poor
  }

  // Clear stats
  clear(): void {
    this.stats = {
      totalSize: 0,
      gzippedSize: 0,
      chunkSizes: {},
      assetSizes: {},
      duplicateModules: [],
      largeModules: []
    };
  }
}

// Global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer();

// Auto-analyze on page load
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      bundleAnalyzer.analyzeCurrent();
    }, 1000);
  });
}
