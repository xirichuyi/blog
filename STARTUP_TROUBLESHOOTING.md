# 项目启动和问题诊断指南

## 🚀 启动步骤

### 第一步：环境检查

#### 1. 检查Rust环境
```bash
# 检查Rust版本
rustc --version
# 应该显示: rustc 1.70+ 

# 检查Cargo版本
cargo --version
# 应该显示: cargo 1.70+

# 如果没有安装，运行：
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### 2. 检查Node.js环境
```bash
# 检查Node.js版本
node --version
# 应该显示: v18+ 或 v20+

# 检查npm版本
npm --version
# 应该显示: 8+
```

#### 3. Windows环境检查
```bash
# 检查Visual Studio Build Tools
where link.exe
# 应该找到link.exe的路径

# 如果没有，下载安装：
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
```

### 第二步：启动后端

#### 1. 进入后端目录
```bash
cd backend
```

#### 2. 检查配置文件
确认 `.env` 文件存在且内容正确：
```env
DATABASE_URL=sqlite:./data/blog.db
HOST=127.0.0.1
PORT=3001
BLOG_ADMIN_TOKEN=admin123456
DEEPSEEK_API_KEY=your-deepseek-api-key-here
RUST_LOG=info
```

#### 3. 创建数据目录
```bash
# 确保数据目录存在
mkdir -p data
```

#### 4. 编译检查
```bash
# 检查代码语法
cargo check

# 如果有错误，查看错误信息并修复
```

#### 5. 启动后端
```bash
# 启动开发服务器
cargo run

# 成功启动应该看到：
# 🚀 Server running on http://127.0.0.1:3001
```

### 第三步：启动前端

#### 1. 新开终端，进入前端目录
```bash
cd frontend-new
```

#### 2. 安装依赖
```bash
# 安装npm依赖
npm install

# 如果遇到网络问题，可以使用：
# npm install --registry https://registry.npmmirror.com
```

#### 3. 检查配置
确认 `.env` 文件存在：
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_DEV_MODE=true
VITE_USE_MOCK_DATA=false
```

#### 4. 启动前端
```bash
# 启动开发服务器
npm run dev

# 成功启动应该看到：
# Local:   http://localhost:3000/
# Network: http://192.168.x.x:3000/
```

## 🔍 常见问题诊断

### 后端启动问题

#### 1. 编译错误：linker not found
```
error: linker `link.exe` not found
```
**解决方案**：
- 安装Visual Studio Build Tools
- 选择"C++ build tools"工作负载
- 重启命令行

#### 2. 端口占用
```
Error: Address already in use (os error 10048)
```
**解决方案**：
```bash
# 查找占用进程
netstat -ano | findstr :3001

# 终止进程
taskkill /PID <PID> /F

# 或修改.env中的PORT配置
```

#### 3. 数据库连接错误
```
Error: Failed to connect to database
```
**解决方案**：
- 检查data目录是否存在
- 检查DATABASE_URL配置
- 确认SQLite权限

#### 4. 依赖编译错误
```
error: failed to compile `xxx`
```
**解决方案**：
```bash
# 清理缓存重新编译
cargo clean
cargo build

# 更新依赖
cargo update
```

### 前端启动问题

#### 1. 依赖安装失败
```
npm ERR! network timeout
```
**解决方案**：
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 或使用yarn
npm install -g yarn
yarn install
```

#### 2. 端口占用
```
Port 3000 is already in use
```
**解决方案**：
- Vite会自动选择其他端口
- 或手动指定端口：`npm run dev -- --port 3002`

#### 3. 模块解析错误
```
Module not found: Can't resolve 'xxx'
```
**解决方案**：
```bash
# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

### 前后端联动问题

#### 1. API请求失败
```
Network Error / CORS Error
```
**检查清单**：
- [ ] 后端服务是否启动 (http://localhost:3001/api/posts)
- [ ] 前端API配置是否正确
- [ ] 代理配置是否正确
- [ ] 防火墙是否阻止连接

#### 2. 认证失败
```
401 Unauthorized
```
**检查清单**：
- [ ] BLOG_ADMIN_TOKEN配置是否正确
- [ ] 前端token输入是否正确
- [ ] localStorage中token是否存在

## 🧪 功能测试

### 1. 后端API测试
```bash
# 测试基础API
curl http://localhost:3001/api/posts

# 测试认证API
curl -H "Authorization: Bearer admin123456" \
  http://localhost:3001/api/admin/verify

# 测试AI聊天
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

### 2. 前端功能测试
- [ ] 访问 http://localhost:3000
- [ ] 博客文章列表加载
- [ ] 文章详情页面
- [ ] 管理员登录 (token: admin123456)
- [ ] AI聊天功能

### 3. 集成测试
- [ ] 前端能正常调用后端API
- [ ] 数据正确显示
- [ ] 错误处理正常
- [ ] 实时功能工作

## 📊 性能监控

### 1. 资源使用监控
```bash
# 查看进程
ps aux | grep cyrus-blog

# 监控内存
top -p $(pgrep cyrus-blog)

# 监控网络
netstat -tulpn | grep :3001
```

### 2. 日志监控
```bash
# 查看后端日志
# 日志会直接输出到控制台

# 设置详细日志
export RUST_LOG=debug
cargo run
```

## 🔧 开发工具

### 1. 代码检查
```bash
# Rust代码检查
cargo clippy

# 格式化代码
cargo fmt

# 前端代码检查
npm run lint
```

### 2. 热重载
- **后端**: 使用 `cargo watch -x run` 实现热重载
- **前端**: Vite自动提供热重载

### 3. 调试工具
- **浏览器开发者工具**: 前端调试
- **Rust调试**: 使用 `println!` 或 `tracing::debug!`
- **API测试**: Postman 或 curl

---

## 📞 获取帮助

如果遇到问题：
1. 查看控制台错误信息
2. 检查网络面板请求状态
3. 查看后端日志输出
4. 参考相关文档
5. 记录详细的错误信息

**记住：大多数问题都可以通过仔细阅读错误信息和检查配置来解决！**
