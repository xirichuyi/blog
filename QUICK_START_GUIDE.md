# Cyrus Blog 快速启动指南

## 🎯 项目概述

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS
- **后端**: Rust + Axum + SQLite + Deepseek AI
- **架构**: 前后端分离，RESTful API

## 🚀 快速启动 (5分钟)

### 第一步：环境准备

#### Windows环境
```bash
# 1. 安装Visual Studio Build Tools
# 下载: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
# 选择: C++ build tools

# 2. 验证Rust环境
rustc --version
```

#### Node.js环境
```bash
# 确保Node.js版本 >= 18
node --version
npm --version
```

### 第二步：启动后端

```bash
# 进入后端目录
cd backend

# 创建环境变量文件
echo "DATABASE_URL=sqlite:./data/blog.db
HOST=127.0.0.1
PORT=3001
BLOG_ADMIN_TOKEN=admin123456
DEEPSEEK_API_KEY=your-api-key-here" > .env

# 创建数据目录
mkdir -p data

# 编译并启动 (首次编译需要几分钟)
cargo run
```

**后端启动成功标志**:
```
🚀 Server running on http://127.0.0.1:3001
```

### 第三步：启动前端

```bash
# 新开终端，进入前端目录
cd frontend-new

# 安装依赖 (首次需要几分钟)
npm install

# 启动开发服务器
npm run dev
```

**前端启动成功标志**:
```
Local:   http://localhost:3000/
Network: http://192.168.x.x:3000/
```

### 第四步：验证联动

1. **访问前端**: http://localhost:3000
2. **测试API**: http://localhost:3001/api/posts
3. **管理员登录**: http://localhost:3000/admin/login (token: admin123456)

## 🔧 已修复的配置问题

### 1. 端口配置
- ✅ **前端**: 3000端口 (Vite开发服务器)
- ✅ **后端**: 3001端口 (Rust API服务器)
- ✅ **代理**: 前端/api请求代理到后端3001端口

### 2. API配置
- ✅ **基础URL**: `http://localhost:3001/api`
- ✅ **环境变量**: `.env`文件配置
- ✅ **代理设置**: Vite配置正确

### 3. 项目结构
- ✅ **前端**: React + Vite (不是Next.js)
- ✅ **路由**: React Router v7
- ✅ **状态管理**: Context API

## 📋 功能测试清单

### 公共功能
- [ ] 首页加载正常
- [ ] 博客文章列表显示
- [ ] 文章详情页面
- [ ] 分类筛选功能
- [ ] AI聊天对话
- [ ] 响应式设计

### 管理员功能
- [ ] 管理员登录 (token: admin123456)
- [ ] 仪表板数据显示
- [ ] 文章列表管理
- [ ] 创建新文章
- [ ] 编辑文章
- [ ] 删除文章
- [ ] AI内容生成

## 🐛 常见问题解决

### 1. 后端编译失败
```
error: linker `link.exe` not found
```
**解决**: 安装Visual Studio Build Tools

### 2. 前端无法连接后端
```
Network Error
```
**检查**:
- 后端服务是否启动 (http://localhost:3001/api/posts)
- 前端代理配置是否正确
- 防火墙是否阻止连接

### 3. 管理员登录失败
```
401 Unauthorized
```
**检查**:
- 后端`.env`中的`BLOG_ADMIN_TOKEN`
- 前端输入的token是否正确

### 4. 端口占用
```
Error: listen EADDRINUSE :::3001
```
**解决**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# 或修改端口配置
```

## 🎯 开发工作流

### 日常开发
```bash
# 终端1: 启动后端
cd backend && cargo run

# 终端2: 启动前端
cd frontend-new && npm run dev

# 终端3: 监控日志
tail -f backend/logs/app.log
```

### 代码修改
- **后端修改**: 自动重新编译 (cargo watch)
- **前端修改**: 热重载 (Vite HMR)
- **API修改**: 重启后端服务

### 构建部署
```bash
# 后端构建
cd backend && cargo build --release

# 前端构建
cd frontend-new && npm run build
```

## 📊 性能监控

### 开发环境监控
```bash
# 查看后端进程
ps aux | grep cyrus-blog

# 监控端口
netstat -tulpn | grep :3001

# 查看内存使用
top -p $(pgrep cyrus-blog)
```

### API性能测试
```bash
# 测试响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/posts

# 并发测试
ab -n 100 -c 10 http://localhost:3001/api/posts
```

## 🔐 安全配置

### 生产环境
```env
# backend/.env
BLOG_ADMIN_TOKEN=your-secure-random-token-here
DEEPSEEK_API_KEY=your-real-api-key
RUST_LOG=info

# frontend-new/.env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### HTTPS配置
```nginx
# Nginx反向代理
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
    }
    
    location / {
        proxy_pass http://localhost:3000/;
    }
}
```

## 📞 技术支持

### 文档参考
- `backend/SETUP_GUIDE.md` - 后端详细配置
- `DEPLOYMENT_GUIDE.md` - 部署指南
- `FRONTEND_BACKEND_INTEGRATION.md` - 联动配置

### 调试技巧
1. **查看浏览器控制台** - 前端错误
2. **查看后端日志** - API错误
3. **使用网络面板** - 请求响应
4. **测试API端点** - curl命令

---

**🎉 启动完成！您的Cyrus Blog现在应该正常运行了！**

访问: http://localhost:3000
