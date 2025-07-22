# Cyrus Blog 部署和测试指南

## 🚀 部署步骤

### 第一步：环境准备

#### 1. 安装Visual Studio Build Tools
```bash
# 下载并安装 Build Tools for Visual Studio 2022
# 确保选择 "C++ build tools" 工作负载
# 勾选 MSVC v143 和 Windows 11 SDK
```

#### 2. 验证Rust环境
```bash
# 检查Rust版本
rustc --version

# 更新Rust工具链
rustup update
```

### 第二步：项目配置

#### 1. 创建环境变量文件
在 `backend/` 目录创建 `.env` 文件：
```env
# 数据库配置
DATABASE_URL=sqlite:./data/blog.db

# 服务器配置
HOST=127.0.0.1
PORT=3001

# 管理员认证
BLOG_ADMIN_TOKEN=your-secure-admin-token-here

# AI服务配置 (可选)
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
```

#### 2. 创建数据目录
```bash
cd backend
mkdir -p data
```

### 第三步：编译和启动

#### 1. 检查代码
```bash
cd backend
cargo check
```

#### 2. 编译项目
```bash
# 开发模式编译
cargo build

# 生产模式编译 (推荐)
cargo build --release
```

#### 3. 运行数据库迁移
```bash
# 如果有sqlx-cli
sqlx migrate run

# 或者直接运行项目，会自动创建数据库
```

#### 4. 启动服务器
```bash
# 开发模式
cargo run

# 生产模式
./target/release/cyrus-blog-backend
```

## 🧪 测试指南

### API测试

#### 1. 健康检查
```bash
# 检查服务器是否启动
curl http://localhost:3001/api/posts
```

#### 2. 公共API测试
```bash
# 获取博客文章列表
curl "http://localhost:3001/api/posts?page=1&limit=5"

# 获取分类列表
curl http://localhost:3001/api/categories

# AI聊天测试
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, tell me about Cyrus"}'
```

#### 3. 管理员API测试
```bash
# 设置管理员token
export ADMIN_TOKEN="your-secure-admin-token-here"

# 验证token
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/verify

# 获取仪表板数据
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/dashboard

# 创建文章
curl -X POST http://localhost:3001/api/admin/posts \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试文章",
    "excerpt": "这是一篇测试文章",
    "content": "# 测试内容\n\n这是测试内容。",
    "categories": ["技术", "测试"]
  }'
```

### 前后端集成测试

#### 1. 启动前端项目
```bash
cd frontend-new
npm install
npm run dev
```

#### 2. 配置前端API地址
确保前端配置指向后端服务：
```javascript
// 在前端配置文件中
const API_BASE_URL = 'http://localhost:3001/api'
```

#### 3. 功能测试清单
- [ ] 博客文章列表加载
- [ ] 文章详情页面
- [ ] 分类筛选功能
- [ ] AI聊天功能
- [ ] 管理员登录
- [ ] 文章创建/编辑/删除
- [ ] AI内容生成

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 编译错误
```
error: linker `link.exe` not found
```
**解决方案**: 安装Visual Studio Build Tools

#### 2. 端口占用
```
Error: Address already in use
```
**解决方案**: 
- 修改 `.env` 中的 `PORT` 配置
- 或终止占用进程：`netstat -ano | findstr :3001`

#### 3. 数据库连接错误
```
Error: Failed to connect to database
```
**解决方案**:
- 检查 `data/` 目录是否存在
- 确认 `DATABASE_URL` 配置正确
- 检查文件权限

#### 4. CORS错误
```
Access to fetch blocked by CORS policy
```
**解决方案**: 后端已配置CORS中间件，检查前端请求地址

#### 5. 认证失败
```
401 Unauthorized
```
**解决方案**:
- 检查 `BLOG_ADMIN_TOKEN` 配置
- 确认请求头包含正确的Bearer token

### 日志调试

#### 启用详细日志
```bash
# 设置日志级别
export RUST_LOG=debug
cargo run
```

#### 查看特定模块日志
```bash
export RUST_LOG=cyrus_blog_backend=debug,sqlx=info
cargo run
```

## 📊 性能监控

### 基本监控指标
- **响应时间**: API响应延迟
- **内存使用**: 进程内存占用
- **CPU使用率**: 处理器负载
- **数据库连接**: 连接池状态

### 监控命令
```bash
# 查看进程资源使用
top -p $(pgrep cyrus-blog)

# 监控网络连接
netstat -an | grep :3001

# 查看日志
tail -f logs/app.log
```

## 🌐 生产部署

### 环境配置
```env
# 生产环境配置
HOST=0.0.0.0
PORT=3001
DATABASE_URL=sqlite:./data/blog.db
RUST_LOG=info
```

### 反向代理配置 (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 系统服务配置 (systemd)
```ini
[Unit]
Description=Cyrus Blog Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/path/to/backend/target/release/cyrus-blog-backend
Restart=always
RestartSec=5
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
```

## ✅ 部署检查清单

### 部署前检查
- [ ] Visual Studio Build Tools已安装
- [ ] Rust环境配置正确
- [ ] 环境变量文件已创建
- [ ] 数据目录已创建

### 部署后验证
- [ ] 服务器成功启动
- [ ] 公共API响应正常
- [ ] 管理员API认证正常
- [ ] AI服务功能正常
- [ ] 前后端集成正常
- [ ] 日志记录正常

### 性能验证
- [ ] 响应时间 < 200ms
- [ ] 内存使用稳定
- [ ] 无内存泄漏
- [ ] 并发处理正常

---

**部署完成后，您的Cyrus Blog后端服务将在 `http://localhost:3001` 运行！**
