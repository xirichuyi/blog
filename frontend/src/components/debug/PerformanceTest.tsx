// Performance test component to verify optimization effects

import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { globalCache } from '../../utils/cacheManager';
import { performanceMonitor } from '../../utils/performanceMonitor';

const PerformanceTest: React.FC = () => {
  const {
    categories,
    tags,
    articles,
    isLoading,
    articlesLoading,
    fetchArticles,
    fetchArticlesByCategory,
    fetchArticlesByTag
  } = useData();

  const [testResults, setTestResults] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  // Run performance tests
  const runTests = async () => {
    setIsRunning(true);
    setTestResults('Running performance tests...\n\n');
    
    const startTime = performance.now();
    
    try {
      // Test 1: Multiple calls to same endpoint (should use cache)
      setTestResults(prev => prev + '=== Test 1: Cache Effectiveness ===\n');
      
      const test1Start = performance.now();
      await Promise.all([
        fetchArticles(1, 12),
        fetchArticles(1, 12),
        fetchArticles(1, 12)
      ]);
      const test1End = performance.now();
      
      setTestResults(prev => prev + `Multiple identical requests took: ${(test1End - test1Start).toFixed(2)}ms\n\n`);
      
      // Test 2: Category and tag requests
      setTestResults(prev => prev + '=== Test 2: Category/Tag Data Sharing ===\n');
      
      const test2Start = performance.now();
      if (categories.length > 0) {
        await fetchArticlesByCategory(categories[0].id);
      }
      if (tags.length > 0) {
        await fetchArticlesByTag(tags[0].name);
      }
      const test2End = performance.now();
      
      setTestResults(prev => prev + `Category/Tag requests took: ${(test2End - test2Start).toFixed(2)}ms\n\n`);
      
      // Test 3: Cache statistics
      setTestResults(prev => prev + '=== Test 3: Cache Statistics ===\n');
      const cacheStats = globalCache.getStats();
      setTestResults(prev => prev + `Cache size: ${cacheStats.size}/${cacheStats.maxSize}\n`);
      setTestResults(prev => prev + `Cache entries:\n`);
      cacheStats.entries.forEach(entry => {
        setTestResults(prev => prev + `  ${entry.key}: age ${(entry.age / 1000).toFixed(1)}s, ttl ${(entry.ttl / 1000).toFixed(1)}s\n`);
      });
      
      // Test 4: Performance monitor statistics
      setTestResults(prev => prev + '\n=== Test 4: Performance Monitor ===\n');
      const perfStats = performanceMonitor.getStats();
      setTestResults(prev => prev + `Total requests: ${perfStats.totalRequests}\n`);
      setTestResults(prev => prev + `Cache hit rate: ${perfStats.cacheHitRate.toFixed(1)}%\n`);
      setTestResults(prev => prev + `Average response time: ${perfStats.averageResponseTime.toFixed(2)}ms\n`);
      setTestResults(prev => prev + `Duplicate requests: ${perfStats.duplicateRequests}\n`);
      
      if (perfStats.duplicateRequests > 0) {
        const duplicates = performanceMonitor.getDuplicatePatterns();
        setTestResults(prev => prev + '\nDuplicate patterns:\n');
        duplicates.forEach(({ endpoint, count }) => {
          setTestResults(prev => prev + `  ${endpoint}: ${count} times\n`);
        });
      }
      
      const totalTime = performance.now() - startTime;
      setTestResults(prev => prev + `\n=== Total Test Time: ${totalTime.toFixed(2)}ms ===\n`);
      
    } catch (error) {
      setTestResults(prev => prev + `\nError during testing: ${error}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  // Clear cache and reset
  const clearCache = () => {
    globalCache.clear();
    performanceMonitor.clear();
    setTestResults('Cache and performance data cleared.\n');
  };

  // Generate performance report
  const generateReport = () => {
    const report = performanceMonitor.generateReport();
    setTestResults(report);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Performance Test Dashboard</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests} 
          disabled={isRunning}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          {isRunning ? 'Running Tests...' : 'Run Performance Tests'}
        </button>
        
        <button 
          onClick={generateReport}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Generate Report
        </button>
        
        <button 
          onClick={clearCache}
          style={{ padding: '10px 20px' }}
        >
          Clear Cache
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Current State:</h3>
        <p>Categories loaded: {categories.length}</p>
        <p>Tags loaded: {tags.length}</p>
        <p>Articles loaded: {articles.length}</p>
        <p>Loading state: {isLoading ? 'Loading basic data' : 'Ready'}</p>
        <p>Articles loading: {articlesLoading ? 'Loading articles' : 'Ready'}</p>
      </div>

      <div>
        <h3>Test Results:</h3>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          whiteSpace: 'pre-wrap',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          {testResults || 'Click "Run Performance Tests" to start testing...'}
        </pre>
      </div>
    </div>
  );
};

export default PerformanceTest;
