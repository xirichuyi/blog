# Cyrus Blog 项目文档索引

## 📚 文档概览

本项目包含完整的开发、部署和使用文档，帮助您快速上手和维护Cyrus Blog系统。

## 🚀 快速开始

### 新用户必读
1. **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** - 5分钟快速启动指南
2. **[FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md)** - 前后端联动配置
3. **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** - 功能测试清单

### 环境配置
1. **[backend/SETUP_GUIDE.md](./backend/SETUP_GUIDE.md)** - 后端环境配置详解
2. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - 部署和测试指南

## 📖 技术文档

### 项目架构
- **[PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md)** - 项目完成总结和技术架构

### API文档
- **[frontend-new/API_DOCUMENTATION.md](./frontend-new/API_DOCUMENTATION.md)** - 完整API接口文档

### 前端文档
- **[frontend-new/CONVERSION_SUMMARY.md](./frontend-new/CONVERSION_SUMMARY.md)** - 前端转换总结
- **[frontend-new/STYLE_FIXES.md](./frontend-new/STYLE_FIXES.md)** - 样式修复记录

## 🏗️ 项目结构

```
cyrus-blog-new/
├── backend/                    # Rust后端
│   ├── src/                   # 源代码
│   │   ├── main.rs           # 应用入口
│   │   ├── config/           # 配置管理
│   │   ├── database/         # 数据访问层
│   │   ├── models/           # 数据模型
│   │   ├── services/         # 业务逻辑层
│   │   ├── handlers/         # API处理器
│   │   ├── middleware/       # 中间件
│   │   └── utils/            # 工具模块
│   ├── migrations/           # 数据库迁移
│   ├── Cargo.toml           # 项目依赖
│   ├── .env                 # 环境变量
│   └── SETUP_GUIDE.md       # 后端配置指南
├── frontend-new/              # React前端
│   ├── src/                 # 源代码
│   │   ├── components/      # 组件
│   │   ├── pages/           # 页面
│   │   ├── services/        # API服务
│   │   ├── context/         # 状态管理
│   │   ├── types/           # 类型定义
│   │   └── hooks/           # 自定义钩子
│   ├── public/              # 静态资源
│   ├── package.json         # 项目依赖
│   ├── vite.config.ts       # Vite配置
│   ├── .env                 # 环境变量
│   └── API_DOCUMENTATION.md # API文档
└── docs/                     # 项目文档
    ├── QUICK_START_GUIDE.md
    ├── DEPLOYMENT_GUIDE.md
    └── ...
```

## 🔧 技术栈

### 后端技术
- **语言**: Rust 1.70+
- **框架**: Axum (Web框架)
- **数据库**: SQLx + SQLite
- **认证**: JWT Token
- **AI服务**: Deepseek API
- **异步**: Tokio运行时

### 前端技术
- **语言**: TypeScript
- **框架**: React 19
- **构建**: Vite 7
- **样式**: Tailwind CSS 4
- **路由**: React Router v7
- **状态**: Context API

## 📋 使用指南

### 开发环境
1. **环境准备**: 安装Rust、Node.js、Visual Studio Build Tools
2. **项目配置**: 配置环境变量和数据库
3. **启动服务**: 分别启动前后端服务
4. **功能测试**: 按照测试清单验证功能

### 生产部署
1. **构建项目**: 编译后端和前端
2. **服务器配置**: 配置Nginx反向代理
3. **环境变量**: 设置生产环境配置
4. **监控维护**: 配置日志和监控

## 🎯 核心功能

### 公共功能
- ✅ 博客文章浏览
- ✅ 分类筛选
- ✅ 文章搜索
- ✅ AI智能聊天
- ✅ 响应式设计

### 管理功能
- ✅ 管理员认证
- ✅ 文章CRUD操作
- ✅ 分类管理
- ✅ AI内容生成
- ✅ 数据统计

### 技术特性
- ✅ RESTful API设计
- ✅ 类型安全架构
- ✅ 统一错误处理
- ✅ 输入验证系统
- ✅ 异步高性能

## 🔍 故障排除

### 常见问题
1. **编译错误** → 参考 `backend/SETUP_GUIDE.md`
2. **端口冲突** → 参考 `FRONTEND_BACKEND_INTEGRATION.md`
3. **API连接** → 参考 `DEPLOYMENT_GUIDE.md`
4. **功能异常** → 参考 `TESTING_CHECKLIST.md`

### 调试工具
- **浏览器开发者工具** - 前端调试
- **Rust日志系统** - 后端调试
- **curl命令** - API测试
- **网络监控** - 连接诊断

## 📞 技术支持

### 文档更新
- 所有文档都会随项目更新
- 重要变更会在相关文档中标注
- 建议定期查看最新版本

### 问题反馈
1. 查阅相关文档
2. 检查错误日志
3. 使用调试工具
4. 记录问题详情

## 🎉 项目状态

### 开发完成度
- **后端开发**: ✅ 100% 完成
- **前端开发**: ✅ 100% 完成
- **API对接**: ✅ 100% 完成
- **功能测试**: ✅ 测试清单已准备
- **文档编写**: ✅ 100% 完成

### 部署就绪度
- **环境配置**: ✅ 配置指南完整
- **构建脚本**: ✅ 构建流程清晰
- **部署文档**: ✅ 部署指南详细
- **监控方案**: ✅ 监控建议完备

---

## 📖 阅读建议

### 首次使用
1. 阅读 `QUICK_START_GUIDE.md`
2. 按步骤启动项目
3. 使用 `TESTING_CHECKLIST.md` 验证功能

### 深入了解
1. 研读 `PROJECT_COMPLETION_SUMMARY.md`
2. 查看 `API_DOCUMENTATION.md`
3. 参考架构设计和最佳实践

### 部署上线
1. 遵循 `DEPLOYMENT_GUIDE.md`
2. 配置生产环境
3. 设置监控和维护

**🎯 祝您使用愉快！如有问题，请参考相应文档或查看错误日志。**
