# 折腾了几个月的博客重构记录

最近几个月一直在折腾自己的博客，从最开始的Next.js全栈到现在的React+Rust分离架构，踩了不少坑，也学到了不少东西。想着记录一下这个过程，也许对其他人有点参考价值。

博客地址：[http://blog.chuyi.uk/](http://blog.chuyi.uk/)

Git记录显示一共提交了87次，其中一大半都是在优化和修bug，可见这个过程有多"痛苦"。

## 技术选择

最终的技术栈是这样的：

前端用的是React 18 + TypeScript，构建工具选了Vite（比Webpack快多了）。UI库本来想用Ant Design或者MUI，但最后选了Material Design 3的官方组件，虽然文档不太好，但胜在原生支持。

后端直接用Rust重写了，主要是想试试Axum这个框架。数据库就用SQLite，简单够用。认证用JWT，文件上传支持多种格式。

说实话，选Rust纯粹是因为想学，如果追求开发效率的话Node.js可能更合适。

## 开发历程

### 第一阶段：从零开始 (2025年5月初)

**5月2日，项目启动**

最开始其实挺简单的，就是想做个个人博客。用Create Next App搭了个架子，然后开始写基础功能。

第一天就遇到了暗色模式的问题。本来以为很简单，结果发现Next.js的SSR和客户端渲染在主题切换上有冲突，页面会闪烁。折腾了半天才用localStorage + useEffect解决。

移动端适配也是个坑，CSS媒体查询写了一堆，但在真机上测试发现还是有问题。特别是iPhone的安全区域，搞了好久才搞定。

**5月3日，核心功能开发**

第二天开始写后台管理系统。本来想用现成的admin模板，但觉得太重了，就自己手写了一套。

文章发布流程比想象中复杂：
- 富文本编辑器选择困难症，试了好几个
- 图片上传功能，要考虑压缩、格式转换
- 文章预览功能，Markdown渲染有各种坑

ESLint配置也让人头疼，各种规则冲突。最后妥协了不少规则才能正常运行。

部署的时候又出问题了，Vercel的构建老是失败，原来是某些依赖在Node环境下有问题。

### 第二阶段：编辑器地狱 (2025年6月)

**6月底的那几天**

项目放了一个多月没管，再次打开发现各种问题。最头疼的是富文本编辑器，HTML显示乱七八糟的。

试了TinyMCE、CKEditor、Quill，每个都有问题：
- TinyMCE太重，加载慢
- CKEditor配置复杂，文档看不懂  
- Quill功能太少，不够用

最后还是选了一个相对轻量的方案，但是花了好几天调样式。

固定侧边栏看起来简单，实际上要考虑：
- 滚动时的位置计算
- 不同屏幕尺寸的适配
- 与主内容区域的交互

### 第三阶段：大重构时代 (2025年7月-9月)

**7月初，痛定思痛**

用了一段时间后发现Next.js的全栈架构有点别扭：
- API路由和页面混在一起，不够清晰
- 服务端渲染有时候反而拖慢速度
- 想要更好的前后端分离

于是决定大重构，前端用纯React，后端单独写。

**前端迁移之路**

从Next.js迁移到Vite + React，工作量比想象中大：

1. **路由系统重写**：Next.js的文件系统路由要改成React Router
2. **API调用重构**：原来的API路由要改成HTTP请求
3. **构建配置**：Vite的配置和Next.js完全不同
4. **状态管理**：没有Next.js的内置状态，要重新设计

迁移过程中最痛苦的是调试。原来在Next.js里能正常工作的代码，在Vite里各种报错。特别是一些第三方库的兼容性问题。

**UI库选择纠结症**

本来用的是自己写的CSS，但越来越难维护。考虑过几个方案：

- **Ant Design**：组件丰富，但样式定制麻烦
- **MUI**：Material Design，但bundle size太大
- **Chakra UI**：轻量，但生态不够丰富
- **Material Web**：Google官方，但文档稀烂

最后选了Material Web，主要是想要原汁原味的Material Design。但这个选择让我后悔了很久，文档真的太差了，很多功能都要自己摸索。

**后端选择：为什么是Rust？**

说实话，选Rust纯粹是想学新技术。从实用角度，Node.js或者Python会更合适。

但既然选了就硬着头皮上：

1. **学习曲线陡峭**：所有权、借用检查，概念理解了好久
2. **生态相对不成熟**：很多功能要自己实现
3. **编译时间长**：每次修改都要等编译，开发效率低
4. **调试困难**：错误信息虽然详细，但理解起来费劲

不过Rust也有好处：
- 性能确实好，内存占用低
- 类型安全，运行时错误少
- 部署简单，单个可执行文件

**性能优化的血泪史**

8月份用Lighthouse测了一下性能，结果惨不忍睹：
- FCP: 3.7秒 (几乎不及格)
- LCP: 7.5秒 (用户早跑了)
- Speed Index: 4.1秒 (慢得离谱)

这个结果让我意识到性能问题的严重性。开始了痛苦的优化之路：

**第一轮优化：资源加载**
- 添加了关键资源预加载
- 优化了字体加载策略  
- 压缩了图片资源
- 启用了gzip压缩

效果有限，FCP只提升到了3.2秒。

**第二轮优化：代码分割**
- 配置了Vite的代码分割
- 懒加载非关键组件
- 拆分了vendor bundle
- 优化了chunk策略

这次效果明显，FCP降到了2.1秒。

**第三轮优化：API和渲染**
- 后端实现了list_with_details接口，一次请求返回所有需要的数据
- 前端使用useMemo缓存计算结果
- 添加了骨架屏改善感知性能
- 优化了React组件的渲染逻辑

最终FCP控制在了1.5秒以内，LCP也降到了2.8秒。

**代码质量的持续改进**

在性能优化过程中发现了很多代码质量问题：

1. **XSS漏洞**：很多地方用了dangerouslySetInnerHTML，改成了安全的渲染方式
2. **内存泄漏**：定时器没有清理，useEffect的依赖数组有问题
3. **TypeScript问题**：到处都是any，类型检查形同虚设
4. **React反模式**：Hook使用不当，组件重渲染过多

这些问题的修复比新功能开发还费时间。特别是TypeScript的类型定义，有些第三方库的类型定义不完整，要自己补充。

**最痛苦的bug：图片加载问题**

有个特别诡异的bug困扰了我很久：文章页面的图片第一次访问时高度很小，但刷新后就正常了。

排查过程：
1. 以为是CSS问题，调了半天样式没用
2. 怀疑是图片加载时机问题，添加了onLoad事件
3. 检查了React的渲染流程，没发现异常
4. 最后发现是图片容器的高度计算有问题

解决方案是添加了图片加载状态管理，确保容器在图片加载完成后再显示。这个bug前前后后折腾了一周。

**目录导航的实现**

文章目录导航功能看起来简单，实现起来各种坑：

1. **标题提取**：最开始用正则表达式，结果把代码块里的内容也提取了
2. **ID生成**：要确保和渲染出来的标题ID一致，用了github-slugger
3. **滚动监听**：要实时跟踪用户滚动位置，更新当前标题
4. **点击跳转**：要考虑固定头部的高度偏移

最终用markdown-it重新解析了Markdown内容，确保标题提取的准确性。

### 第四阶段：打磨完善 (9月至今)

进入9月后，主要功能基本完成，开始各种细节打磨：

**响应式设计的完善**
- 移动端的交互优化
- 平板设备的适配
- 超宽屏幕的布局调整

**用户体验的提升**
- 添加了加载动画
- 优化了页面切换效果
- 改进了错误提示

**代码的持续重构**
- 组件拆分和复用
- 工具函数的封装
- 常量的统一管理

到现在为止，项目算是基本稳定了。虽然还有一些小问题，但已经可以正常使用了。

## 技术实现的一些细节

### 前端架构的选择

最终采用了一个叫ABC的架构模式，主要是为了让代码看起来更清晰：

- A区放所有的状态和Hook调用
- B区放业务逻辑和事件处理
- C区纯渲染，不掺杂逻辑

这样做的好处是代码结构很清楚，但缺点是有些组件会变得很长。

### 后端的分层设计

Rust后端按照传统的分层架构来组织：

```
src/
├── handlers/          # 处理HTTP请求
├── services/          # 业务逻辑
├── database/          # 数据库操作
├── models/            # 数据结构
├── middleware/        # 中间件
└── utils/             # 工具函数
```

这个结构比较常见，但在Rust里实现起来有些麻烦，主要是所有权和生命周期的问题。

## 一些值得记录的技术点

### 图片加载的那个诡异bug

前面提到的图片高度问题，最终的解决方案是这样的：

```typescript
const [imageLoaded, setImageLoaded] = useState(false);
const [imageError, setImageError] = useState(false);

// 监听图片加载完成
const handleImageLoad = useCallback(() => {
  setImageLoaded(true);
  setImageError(false);
}, []);

// 渐进式显示，避免布局跳动
<img
  src={imageSrc}
  alt={alt}
  onLoad={handleImageLoad}
  onError={handleImageError}
  style={{ 
    opacity: imageLoaded && !imageError ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out'
  }}
/>
```

关键是要在图片加载完成后才显示，避免容器高度计算错误。

### 目录导航的实现

最开始用正则表达式提取标题，结果各种问题。后来改用markdown-it解析：

```typescript
const extractHeadings = useCallback((content: string) => {
  const md = new MarkdownIt();
  const tokens = md.parse(content, {});
  const headings = [];

  // 遍历token找出真正的标题
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.substring(1));
      const nextToken = tokens[i + 1];
      
      if (nextToken && nextToken.type === 'inline') {
        const title = nextToken.content.trim();
        const id = generateHeadingId(title); // 确保ID一致
        headings.push({ level, title, id });
      }
    }
  }
  
  return headings;
}, []);
```

这样就能准确提取标题，不会把代码块里的内容误识别了。

### 性能优化的一些尝试

创建了一个专门的性能优化组件：

```typescript
const PerformanceOptimizer: React.FC = () => {
  useEffect(() => {
    // 预加载关键资源
    const preloadResources = [
      { href: '/api/articles', as: 'fetch' },
      { href: '/assets/fonts/roboto.woff2', as: 'font' }
    ];

    preloadResources.forEach(({ href, as }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      document.head.appendChild(link);
    });
  }, []);

  return null;
};
```

虽然效果有限，但聊胜于无。

## 一些数据

看了一下git记录，总共提交了87次，其中52次都是在优化和修bug，占了60%。开发周期大概5个月，代码行数估计有15000行左右（前后端加起来）。

React组件写了46个，后端API接口30多个。

## 总结

这几个月的折腾下来，感觉学到了不少东西：

### 技术方面

1. **Rust确实有意思**，虽然学习曲线陡，但写出来的代码很有安全感
2. **性能优化是个无底洞**，但用户体验确实重要
3. **Material Design 3**的组件库坑很多，但效果还不错
4. **前后端分离**比想象中复杂，但架构更清晰

### 项目管理方面

1. **不要一开始就追求完美**，先跑起来再说
2. **版本控制很重要**，每次改动都要及时提交
3. **文档要写**，不然过几天就忘了当时为什么这么写
4. **测试很必要**，虽然我偷懒了很多

### 个人成长

最大的收获是对全栈开发有了更深的理解。以前总觉得前端就是写写页面，后端就是处理数据，现在发现两者的结合才是关键。

还有就是耐心很重要。有些bug真的很诡异，比如那个图片高度问题，折腾了一周才解决。但解决了之后的成就感也很爽。

## 还想做的事

1. **评论系统**：想加个评论功能，但还没想好用什么方案
2. **搜索优化**：现在的搜索比较简单，想做得更智能一些
3. **移动端优化**：虽然做了响应式，但移动端体验还能更好
4. **性能继续优化**：总觉得还能更快一些

## 最后

这个项目算是我对现代Web开发的一次实践。虽然踩了很多坑，但也收获了很多。

如果你也在做类似的项目，希望我的经历能给你一些参考。有问题的话可以在博客上留言（等我把评论系统做好）。

博客地址：[http://blog.chuyi.uk/](http://blog.chuyi.uk/)

代码还在持续优化中，欢迎来踩踩！

---

*写于2025年9月，记录了一个普通程序员的折腾历程*
