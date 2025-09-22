# 常用模式和最佳实践

- Lighthouse性能分析显示严重问题：FCP 3.7秒(0.02分)、LCP 7.5秒(0.01分)、Speed Index 4.1秒(0.09分)。已实施紧急优化：1.创建PerformanceOptimizer组件进行关键资源预加载和渲染优化；2.优化Vite配置启用激进代码分割；3.创建SkeletonLoader骨架屏组件改善感知性能；4.延迟非关键资源加载。主要问题是首屏渲染和最大内容渲染极慢，需要进一步优化API调用和资源加载策略。
- 博客性能优化完成：1.后端新增list_with_details API端点，一次请求返回文章+标签+分类信息，避免N+1查询；2.前端getPosts方法改用优化端点，大幅减少网络请求；3.首页保持7篇文章，文章页面12篇文章的分页设置；4.修复首页第二类文章CSS样式，图片高度200px在上，文字内容在下，总高度360px
- API接口兼容性修复完成：1.后端PostListQuery新增search和tag_id参数支持；2.后端repository添加搜索和标签筛选的SQL查询逻辑；3.前端getPosts方法支持search和tag_id参数；4.前端getPostsByTag方法改用后端筛选，提升性能；5.搜索、分类筛选、标签筛选功能现在都使用优化的list_with_details端点
- 修复数据结构问题：移除PostWithDetails中的#[serde(flatten)]，确保后端返回的数据结构为{post: {...}, tags: [...], category_name: "..."}，与前端期望的嵌套结构匹配，解决渲染问题
- Post模型category_name优化完成：1.修复了所有Post实例创建时的category_name字段处理；2.新增get_by_id_with_category方法通过JOIN查询直接获取分类名；3.更新get_post_detail和list_posts使用带分类名的查询；4.现在文章列表API直接返回category_name字段，前端无需额外查询，提升了性能和数据一致性
- 前端代码审查和修复完成：1.修复了XSS安全漏洞，移除了所有innerHTML使用，改为React状态管理；2.修复了硬编码颜色问题，全部替换为CSS变量；3.修复了API硬编码IP(172.245.148.234)，改为使用localhost作为默认值；4.创建了logger工具类用于条件日志输出，只在开发模式下显示console.log；5.清理了主要文件中的console.log调用。
- 前端代码深度优化完成：1.性能优化-使用useMemo缓存displayArticles、featuredArticles和gradients数组，避免不必要的重渲染；2.内存泄漏修复-为handleSearchBlur的setTimeout添加清理机制，使用useRef存储timer引用；3.TypeScript类型优化-移除所有any类型，使用正确的React.ChangeEvent和React.CSSProperties类型；4.代码质量提升-所有linting错误已修复，代码符合最佳实践。
- 前端代码审查完成，修复了所有关键问题：1.React Hooks错误修复-将所有useMemo调用移到条件渲染之前，解决了"Rendered more hooks than during the previous render"错误；2.XSS安全漏洞修复-移除所有innerHTML使用，改为React状态管理；3.硬编码颜色全部替换为CSS变量；4.API硬编码IP修复；5.创建了条件日志工具；6.性能优化和内存泄漏修复；7.TypeScript类型完善。项目现在运行正常，无错误。
- 修复了两个关键问题：1.Home页面二级文章丢失问题-添加了useLocation监听路由变化，当切换回Home页面时强制重新加载数据，清空状态避免缓存问题；2.Article页面hover效果不一致-移除了transform动画效果，改为与Home页面一致的背景色变化hover效果，确保用户体验统一。
- 完全按照Home页面重新设计了Article页面：1.移除了Article页面对ArticleCard组件的所有样式覆盖，让它使用原生ArticleCard样式；2.将Article页面的ArticleCard variant从compact改为default，与Home页面完全一致；3.简化了Home页面状态管理，每次路由切换回Home都完全重置状态并重新加载；4.修复了TypeScript类型错误，确保articleTag类型安全检查。现在两个页面的文章item完全对齐。
