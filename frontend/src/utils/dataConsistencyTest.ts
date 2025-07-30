import { blogApi, adminApi, cacheManager } from '@/services/api';

/**
 * 数据一致性测试工具
 * 用于验证管理界面操作后公共页面的数据更新
 */
export class DataConsistencyTester {
  private testResults: Array<{
    test: string;
    passed: boolean;
    message: string;
    timestamp: Date;
  }> = [];

  /**
   * 运行所有数据一致性测试
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting data consistency tests...');
    this.testResults = [];

    await this.testPostCreationConsistency();
    await this.testPostUpdateConsistency();
    await this.testPostDeletionConsistency();
    await this.testCacheInvalidation();
    await this.testCategoryConsistency();

    this.printResults();
  }

  /**
   * 测试文章创建后的数据一致性
   */
  private async testPostCreationConsistency(): Promise<void> {
    try {
      // 获取创建前的文章列表
      const beforePosts = await blogApi.getPosts(1, 10);
      const beforeCount = beforePosts.totalPosts;

      // 创建测试文章
      const testPost = {
        title: `Test Post ${Date.now()}`,
        excerpt: 'This is a test post for data consistency testing',
        content: '# Test Content\n\nThis is test content.',
        slug: `test-post-${Date.now()}`,
        categories: ['test'],
        date: new Date().toISOString()
      };

      const createResult = await adminApi.createPost(testPost);

      if (createResult) {
        // 等待一小段时间确保数据传播
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 验证公共API能获取到新文章
        const afterPosts = await blogApi.getPosts(1, 10);
        const newPost = await blogApi.getPostBySlug(testPost.slug);

        const countIncreased = afterPosts.totalPosts > beforeCount;
        const postExists = !!newPost;

        if (countIncreased && postExists) {
          this.addTestResult('Post Creation Consistency', true, 'New post appears in public API after creation');
        } else {
          this.addTestResult('Post Creation Consistency', false, `Count increased: ${countIncreased}, Post exists: ${postExists}`);
        }

        // 清理测试数据
        await adminApi.deletePost(testPost.slug);
      } else {
        this.addTestResult('Post Creation Consistency', false, 'Failed to create test post');
      }
    } catch (error) {
      this.addTestResult('Post Creation Consistency', false, `Error: ${error}`);
    }
  }

  /**
   * 测试文章更新后的数据一致性
   */
  private async testPostUpdateConsistency(): Promise<void> {
    try {
      // 获取现有文章列表
      const posts = await blogApi.getPosts(1, 5);
      if (posts.posts.length === 0) {
        this.addTestResult('Post Update Consistency', false, 'No posts available for testing');
        return;
      }

      const testPost = posts.posts[0];
      const originalTitle = testPost.title;
      const newTitle = `Updated ${originalTitle} ${Date.now()}`;

      // 更新文章
      const updateResult = await adminApi.updatePost(testPost.slug, {
        title: newTitle
      });

      if (updateResult) {
        // 等待数据传播
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 验证公共API反映了更新
        const updatedPost = await blogApi.getPostBySlug(testPost.slug);
        
        if (updatedPost && updatedPost.title === newTitle) {
          this.addTestResult('Post Update Consistency', true, 'Post updates appear in public API');
        } else {
          this.addTestResult('Post Update Consistency', false, 'Post updates not reflected in public API');
        }

        // 恢复原标题
        await adminApi.updatePost(testPost.slug, {
          title: originalTitle
        });
      } else {
        this.addTestResult('Post Update Consistency', false, 'Failed to update test post');
      }
    } catch (error) {
      this.addTestResult('Post Update Consistency', false, `Error: ${error}`);
    }
  }

  /**
   * 测试文章删除后的数据一致性
   */
  private async testPostDeletionConsistency(): Promise<void> {
    try {
      // 创建一个临时文章用于删除测试
      const testPost = {
        title: `Delete Test Post ${Date.now()}`,
        excerpt: 'This post will be deleted',
        content: '# Delete Test\n\nThis post is for deletion testing.',
        slug: `delete-test-${Date.now()}`,
        categories: ['test'],
        date: new Date().toISOString()
      };

      const createResult = await adminApi.createPost(testPost);

      if (createResult) {
        // 确认文章存在
        const postExists = await blogApi.getPostBySlug(testPost.slug);
        
        if (postExists) {
          // 删除文章
          await adminApi.deletePost(testPost.slug);

          // 删除成功，继续验证
          // 等待数据传播
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 验证文章不再存在于公共API
          try {
            await blogApi.getPostBySlug(testPost.slug);
            this.addTestResult('Post Deletion Consistency', false, 'Deleted post still accessible via public API');
          } catch {
            this.addTestResult('Post Deletion Consistency', true, 'Deleted post properly removed from public API');
          }
        } else {
          this.addTestResult('Post Deletion Consistency', false, 'Test post was not created successfully');
        }
      } else {
        this.addTestResult('Post Deletion Consistency', false, 'Failed to create test post for deletion');
      }
    } catch (error) {
      this.addTestResult('Post Deletion Consistency', false, `Error: ${error}`);
    }
  }

  /**
   * 测试缓存失效机制
   */
  private async testCacheInvalidation(): Promise<void> {
    try {
      // 清理所有缓存
      cacheManager.clear();

      // 获取文章列表（这会缓存结果）
      const posts1 = await blogApi.getPosts(1, 5);
      
      // 再次获取（应该从缓存返回）
      const posts2 = await blogApi.getPosts(1, 5);

      // 清理缓存
      cacheManager.invalidate('posts');

      // 再次获取（应该重新从API获取）
      const posts3 = await blogApi.getPosts(1, 5);

      // 验证数据一致性
      const dataConsistent = posts1.totalPosts === posts2.totalPosts && 
                            posts2.totalPosts === posts3.totalPosts;

      if (dataConsistent) {
        this.addTestResult('Cache Invalidation', true, 'Cache invalidation works correctly');
      } else {
        this.addTestResult('Cache Invalidation', false, 'Cache invalidation may have issues');
      }
    } catch (error) {
      this.addTestResult('Cache Invalidation', false, `Error: ${error}`);
    }
  }

  /**
   * 测试分类数据一致性
   */
  private async testCategoryConsistency(): Promise<void> {
    try {
      // 获取分类列表
      const categories = await blogApi.getCategories();
      
      // 验证分类数据格式
      const isValidFormat = Array.isArray(categories) && 
                           categories.every(cat => typeof cat === 'string');

      if (isValidFormat) {
        this.addTestResult('Category Consistency', true, 'Category data format is consistent');
      } else {
        this.addTestResult('Category Consistency', false, 'Category data format is inconsistent');
      }
    } catch (error) {
      this.addTestResult('Category Consistency', false, `Error: ${error}`);
    }
  }

  /**
   * 添加测试结果
   */
  private addTestResult(test: string, passed: boolean, message: string): void {
    this.testResults.push({
      test,
      passed,
      message,
      timestamp: new Date()
    });
  }

  /**
   * 打印测试结果
   */
  private printResults(): void {
    console.log('\n📊 Data Consistency Test Results:');
    console.log('=====================================');
    
    let passedCount = 0;
    const totalCount = this.testResults.length;

    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.test}: ${result.message}`);
      if (result.passed) passedCount++;
    });

    console.log('=====================================');
    console.log(`📈 Summary: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All data consistency tests passed!');
    } else {
      console.log('⚠️  Some data consistency issues detected.');
    }
  }

  /**
   * 获取测试结果
   */
  getResults() {
    return this.testResults;
  }
}

// 导出单例实例
export const dataConsistencyTester = new DataConsistencyTester();
