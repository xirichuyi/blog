# Cyrus Blog Backend Setup Guide

## 🔧 编译环境配置

### 问题描述
在Windows环境下编译Rust项目时遇到以下错误：
```
error: linker `link.exe` not found
note: the msvc targets depend on the msvc linker but `link.exe` was not found
```

### 解决方案：安装Visual Studio Build Tools

#### 步骤1: 下载Build Tools
1. 访问 [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. 下载 "Build Tools for Visual Studio 2022"

#### 步骤2: 安装配置
1. 运行下载的安装程序
2. 选择 **"C++ build tools"** 工作负载
3. 在右侧详细信息中确保勾选：
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools (最新版本)
   - ✅ Windows 11 SDK (最新版本)
   - ✅ CMake tools for Visual Studio

#### 步骤3: 验证安装
1. 重启命令行/PowerShell
2. 运行以下命令验证：
```bash
# 检查Rust工具链
rustc --version

# 检查编译环境
cargo check
```

## 🚀 项目启动指南

### 环境变量配置
创建 `.env` 文件：
```env
# 数据库配置
DATABASE_URL=sqlite:./data/blog.db

# 服务器配置
HOST=127.0.0.1
PORT=3001

# 管理员认证
BLOG_ADMIN_TOKEN=your-secure-admin-token

# AI服务配置 (可选)
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
```

### 数据库初始化
```bash
# 创建数据目录
mkdir -p data

# 运行数据库迁移
sqlx migrate run
```

### 编译和运行
```bash
# 检查代码
cargo check

# 编译项目
cargo build --release

# 运行服务器
cargo run
```

## 📡 API端点

### 公共API
- `GET /api/posts` - 获取博客文章列表
- `GET /api/posts/{slug}` - 获取单篇文章
- `GET /api/categories` - 获取所有分类
- `GET /api/categories/{category}` - 获取分类下的文章
- `POST /api/chat` - AI聊天

### 管理员API (需要Bearer Token)
- `GET /api/admin/verify` - 验证token
- `GET /api/admin/dashboard` - 获取仪表板数据
- `GET /api/admin/posts` - 获取所有文章
- `POST /api/admin/posts` - 创建文章
- `GET /api/admin/posts/{slug}` - 获取文章详情
- `PUT /api/admin/posts/{slug}` - 更新文章
- `DELETE /api/admin/posts/{slug}` - 删除文章
- `POST /api/admin/ai-assist` - AI内容生成
- `GET /api/admin/categories` - 获取分类

## 🏗️ 项目架构

```
backend/
├── src/
│   ├── main.rs              # 应用入口
│   ├── config/              # 配置管理
│   ├── database/            # 数据访问层
│   ├── models/              # 数据模型
│   ├── services/            # 业务逻辑层
│   ├── handlers/            # API处理器
│   ├── middleware/          # 中间件
│   └── utils/               # 工具模块
├── migrations/              # 数据库迁移
└── Cargo.toml              # 项目依赖
```

## 🔍 故障排除

### 常见问题

#### 1. 编译错误
- 确保安装了Visual Studio Build Tools
- 检查Rust版本：`rustup update`

#### 2. 数据库连接错误
- 确保数据库文件路径正确
- 检查文件权限

#### 3. 端口占用
- 修改 `.env` 文件中的 `PORT` 配置
- 或使用 `netstat -ano | findstr :3001` 查找占用进程

#### 4. AI服务错误
- 检查 `DEEPSEEK_API_KEY` 配置
- 验证API密钥有效性

## 📝 开发说明

### 代码特性
- ✅ 完整的错误处理系统
- ✅ 输入验证和数据校验
- ✅ 类型安全的API设计
- ✅ 异步高性能架构
- ✅ 结构化日志记录
- ✅ CORS和安全中间件

### 扩展指南
1. 添加新API端点：在 `handlers/` 目录创建处理器
2. 添加数据模型：在 `models/` 目录定义结构体
3. 添加业务逻辑：在 `services/` 目录实现服务
4. 添加数据库操作：在 `database/` 目录扩展repository

## 🎯 部署建议

### 生产环境配置
1. 使用环境变量管理敏感信息
2. 配置反向代理 (Nginx/Apache)
3. 启用HTTPS
4. 配置日志轮转
5. 设置监控和健康检查

### 性能优化
1. 启用数据库连接池
2. 配置适当的缓存策略
3. 使用CDN加速静态资源
4. 监控内存和CPU使用率
