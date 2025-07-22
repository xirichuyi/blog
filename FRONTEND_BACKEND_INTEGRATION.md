# 前后端联动配置指南

## 🔍 发现的问题

### 1. **端口配置冲突**
- **前端Vite服务器**: 配置为端口 3001
- **后端Rust服务器**: 也配置为端口 3001
- **前端API代理**: 指向端口 3000 (错误)

### 2. **API地址配置错误**
- 前端API基础URL指向 `http://localhost:3000/api`
- 后端实际运行在 `http://localhost:3001/api`

### 3. **项目结构混淆**
- 这是React + Vite项目，不是Next.js
- 但配置中可能有Next.js的残留代码

## 🛠️ 解决方案

### 方案1: 修改前端配置 (推荐)

#### 1. 修改前端端口
编辑 `frontend-new/vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,  // 改为3000
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // 指向后端端口
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // ... 其他配置
})
```

#### 2. 修改API配置
编辑 `frontend-new/src/services/api.ts`:
```typescript
// 修改第6行
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

#### 3. 创建环境变量文件
在 `frontend-new/` 目录创建 `.env`:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### 方案2: 修改后端配置

#### 修改后端端口
编辑 `backend/.env`:
```env
HOST=127.0.0.1
PORT=3000  # 改为3000以匹配前端配置
DATABASE_URL=sqlite:./data/blog.db
BLOG_ADMIN_TOKEN=your-secure-admin-token
```

## 🚀 启动步骤

### 1. 启动后端服务器
```bash
cd backend

# 确保环境变量正确
# 如果使用方案1，PORT=3001
# 如果使用方案2，PORT=3000

# 编译并启动
cargo run
```

### 2. 启动前端服务器
```bash
cd frontend-new

# 安装依赖（如果还没有）
npm install

# 启动开发服务器
npm run dev
```

### 3. 验证连接
- 前端地址: `http://localhost:3000` (方案1) 或 `http://localhost:3001` (方案2)
- 后端API: `http://localhost:3001/api` (方案1) 或 `http://localhost:3000/api` (方案2)

## 🧪 测试联动

### 1. 检查API连接
在浏览器开发者工具中查看网络请求：
```javascript
// 在浏览器控制台测试
fetch('/api/posts')
  .then(res => res.json())
  .then(data => console.log(data))
```

### 2. 测试功能
- [ ] 博客文章列表加载
- [ ] 文章详情页面
- [ ] 分类筛选
- [ ] AI聊天功能
- [ ] 管理员登录
- [ ] 文章CRUD操作

## 🔧 常见问题解决

### 1. CORS错误
```
Access to fetch at 'http://localhost:3001/api/posts' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**解决方案**: 后端已配置CORS中间件，检查：
- 前端请求地址是否正确
- 后端服务是否正常启动

### 2. 网络错误
```
Network Error / ERR_CONNECTION_REFUSED
```

**解决方案**:
- 确认后端服务正在运行
- 检查端口配置是否正确
- 确认防火墙没有阻止连接

### 3. 认证错误
```
401 Unauthorized
```

**解决方案**:
- 检查管理员token配置
- 确认localStorage中的token有效
- 验证后端认证中间件

### 4. 代理不工作
如果Vite代理不工作，可以直接修改API基础URL：
```typescript
// 临时解决方案
const API_BASE_URL = 'http://localhost:3001/api';
```

## 📋 配置检查清单

### 后端检查
- [ ] `.env` 文件配置正确
- [ ] 端口没有被占用
- [ ] 服务器成功启动
- [ ] API端点响应正常
- [ ] CORS中间件工作正常

### 前端检查
- [ ] `vite.config.ts` 端口配置
- [ ] `api.ts` 基础URL配置
- [ ] `.env` 环境变量
- [ ] 代理配置正确
- [ ] 依赖安装完成

### 联动测试
- [ ] 前端可以访问后端API
- [ ] 数据正确显示
- [ ] 错误处理正常
- [ ] 认证流程工作
- [ ] 实时功能正常

## 🎯 推荐配置

### 开发环境
```
前端: http://localhost:3000 (Vite)
后端: http://localhost:3001 (Rust)
API:  http://localhost:3001/api
```

### 生产环境
```
前端: https://your-domain.com
后端: https://api.your-domain.com
API:  https://api.your-domain.com/api
```

## 📝 调试技巧

### 1. 查看网络请求
- 打开浏览器开发者工具
- 切换到Network标签
- 查看API请求状态和响应

### 2. 检查控制台错误
- 查看浏览器控制台
- 查看后端日志输出
- 注意CORS和网络错误

### 3. 使用API测试工具
```bash
# 测试后端API
curl http://localhost:3001/api/posts

# 测试认证
curl -H "Authorization: Bearer your-token" \
  http://localhost:3001/api/admin/verify
```

---

**按照以上配置，您的前后端应该能够正常联动！**
