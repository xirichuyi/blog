# 常用模式和最佳实践

- Lighthouse性能分析显示严重问题：FCP 3.7秒(0.02分)、LCP 7.5秒(0.01分)、Speed Index 4.1秒(0.09分)。已实施紧急优化：1.创建PerformanceOptimizer组件进行关键资源预加载和渲染优化；2.优化Vite配置启用激进代码分割；3.创建SkeletonLoader骨架屏组件改善感知性能；4.延迟非关键资源加载。主要问题是首屏渲染和最大内容渲染极慢，需要进一步优化API调用和资源加载策略。
- 博客性能优化完成：1.后端新增list_with_details API端点，一次请求返回文章+标签+分类信息，避免N+1查询；2.前端getPosts方法改用优化端点，大幅减少网络请求；3.首页保持7篇文章，文章页面12篇文章的分页设置；4.修复首页第二类文章CSS样式，图片高度200px在上，文字内容在下，总高度360px
- API接口兼容性修复完成：1.后端PostListQuery新增search和tag_id参数支持；2.后端repository添加搜索和标签筛选的SQL查询逻辑；3.前端getPosts方法支持search和tag_id参数；4.前端getPostsByTag方法改用后端筛选，提升性能；5.搜索、分类筛选、标签筛选功能现在都使用优化的list_with_details端点
- 修复数据结构问题：移除PostWithDetails中的#[serde(flatten)]，确保后端返回的数据结构为{post: {...}, tags: [...], category_name: "..."}，与前端期望的嵌套结构匹配，解决渲染问题
- Post模型category_name优化完成：1.修复了所有Post实例创建时的category_name字段处理；2.新增get_by_id_with_category方法通过JOIN查询直接获取分类名；3.更新get_post_detail和list_posts使用带分类名的查询；4.现在文章列表API直接返回category_name字段，前端无需额外查询，提升了性能和数据一致性
