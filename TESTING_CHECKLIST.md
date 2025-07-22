# Cyrus Blog 功能测试清单

## 🧪 测试准备

### 前置条件
- [ ] 后端服务运行在 http://localhost:3001
- [ ] 前端服务运行在 http://localhost:3000
- [ ] 浏览器开发者工具已打开
- [ ] 管理员token: `admin123456`

### 测试环境
```bash
# 确认服务状态
curl http://localhost:3001/api/posts  # 后端API
curl http://localhost:3000            # 前端页面
```

## 📋 公共功能测试

### 1. 首页功能
- [ ] **页面加载**: 访问 http://localhost:3000
- [ ] **导航栏**: 显示Logo、菜单项
- [ ] **响应式**: 移动端适配正常
- [ ] **主题切换**: 深色模式切换
- [ ] **页脚**: 版权信息显示

**测试步骤**:
1. 打开 http://localhost:3000
2. 检查页面元素是否正常显示
3. 调整浏览器窗口大小测试响应式
4. 点击主题切换按钮

### 2. 博客文章列表
- [ ] **文章加载**: `/blog` 页面显示文章列表
- [ ] **分页功能**: 翻页按钮工作正常
- [ ] **文章预览**: 标题、摘要、日期显示
- [ ] **分类标签**: 文章分类正确显示
- [ ] **加载状态**: Loading动画显示

**测试步骤**:
1. 访问 http://localhost:3000/blog
2. 检查文章列表是否加载
3. 测试分页功能
4. 查看网络请求是否正常

**API测试**:
```bash
# 测试文章列表API
curl "http://localhost:3001/api/posts?page=1&limit=6"

# 预期响应格式
{
  "posts": [...],
  "totalPosts": number,
  "totalPages": number
}
```

### 3. 文章详情页
- [ ] **文章内容**: 完整文章内容显示
- [ ] **Markdown渲染**: 格式正确渲染
- [ ] **代码高亮**: 代码块语法高亮
- [ ] **图片显示**: 图片正常加载
- [ ] **返回按钮**: 导航功能正常

**测试步骤**:
1. 从文章列表点击进入详情页
2. 检查Markdown内容渲染
3. 测试代码块高亮
4. 验证返回导航

**API测试**:
```bash
# 测试单篇文章API
curl "http://localhost:3001/api/posts/test-slug"

# 预期响应: BlogPost对象
```

### 4. 分类功能
- [ ] **分类列表**: `/categories` 显示所有分类
- [ ] **分类筛选**: 点击分类显示相关文章
- [ ] **分类计数**: 显示每个分类的文章数量
- [ ] **面包屑**: 导航路径显示

**测试步骤**:
1. 访问 http://localhost:3000/categories
2. 点击特定分类
3. 验证筛选结果
4. 检查URL变化

**API测试**:
```bash
# 测试分类列表
curl "http://localhost:3001/api/categories"

# 测试分类文章
curl "http://localhost:3001/api/categories/技术"
```

### 5. AI聊天功能
- [ ] **聊天界面**: 聊天窗口正常显示
- [ ] **消息发送**: 能够发送消息
- [ ] **AI回复**: 收到AI响应
- [ ] **历史记录**: 对话历史保存
- [ ] **错误处理**: 网络错误时的提示

**测试步骤**:
1. 在任意页面打开聊天窗口
2. 发送测试消息: "Hello, tell me about Cyrus"
3. 等待AI回复
4. 测试多轮对话

**API测试**:
```bash
# 测试AI聊天API
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, tell me about Cyrus"}'
```

## 🔐 管理员功能测试

### 1. 管理员登录
- [ ] **登录页面**: `/admin/login` 页面显示
- [ ] **Token验证**: 输入正确token登录成功
- [ ] **错误处理**: 错误token显示错误信息
- [ ] **重定向**: 登录后跳转到仪表板
- [ ] **状态保持**: 刷新页面保持登录状态

**测试步骤**:
1. 访问 http://localhost:3000/admin/login
2. 输入token: `admin123456`
3. 点击登录
4. 验证跳转到仪表板

**API测试**:
```bash
# 测试token验证
curl -H "Authorization: Bearer admin123456" \
  http://localhost:3001/api/admin/verify
```

### 2. 管理员仪表板
- [ ] **数据统计**: 文章数量、分类数量等
- [ ] **最近文章**: 显示最新文章列表
- [ ] **快捷操作**: 创建文章、管理分类等
- [ ] **系统状态**: 服务器状态信息

**测试步骤**:
1. 登录后访问仪表板
2. 检查统计数据是否正确
3. 验证快捷操作链接

**API测试**:
```bash
# 测试仪表板数据
curl -H "Authorization: Bearer admin123456" \
  http://localhost:3001/api/admin/dashboard
```

### 3. 文章管理
- [ ] **文章列表**: 显示所有文章
- [ ] **创建文章**: 新建文章功能
- [ ] **编辑文章**: 修改现有文章
- [ ] **删除文章**: 删除文章功能
- [ ] **批量操作**: 批量删除等操作

**测试步骤**:
1. 访问 http://localhost:3000/admin/posts
2. 测试创建新文章
3. 编辑现有文章
4. 删除测试文章

**API测试**:
```bash
# 创建文章
curl -X POST http://localhost:3001/api/admin/posts \
  -H "Authorization: Bearer admin123456" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试文章",
    "excerpt": "这是测试摘要",
    "content": "# 测试内容\n\n这是测试内容。",
    "categories": ["测试"]
  }'

# 更新文章
curl -X PUT http://localhost:3001/api/admin/posts/test-slug \
  -H "Authorization: Bearer admin123456" \
  -H "Content-Type: application/json" \
  -d '{"title": "更新的标题"}'

# 删除文章
curl -X DELETE http://localhost:3001/api/admin/posts/test-slug \
  -H "Authorization: Bearer admin123456"
```

### 4. AI内容生成
- [ ] **AI助手界面**: AI辅助写作界面
- [ ] **内容生成**: 根据提示生成内容
- [ ] **模板选择**: 不同类型的内容模板
- [ ] **内容插入**: 生成内容插入到编辑器

**测试步骤**:
1. 在文章编辑页面打开AI助手
2. 输入内容提示
3. 选择生成类型
4. 验证生成结果

**API测试**:
```bash
# 测试AI内容生成
curl -X POST http://localhost:3001/api/admin/ai-assist \
  -H "Authorization: Bearer admin123456" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "写一篇关于Rust编程的技术文章",
    "type": "blog-post"
  }'
```

## 🔍 错误处理测试

### 1. 网络错误
- [ ] **后端离线**: 后端服务停止时的错误提示
- [ ] **API超时**: 请求超时的处理
- [ ] **网络中断**: 网络连接问题的处理

### 2. 认证错误
- [ ] **无效Token**: 错误token的处理
- [ ] **Token过期**: 过期token的处理
- [ ] **权限不足**: 访问受限资源的处理

### 3. 数据错误
- [ ] **404错误**: 不存在的文章/页面
- [ ] **数据格式错误**: 无效数据的处理
- [ ] **服务器错误**: 500错误的处理

## 📊 性能测试

### 1. 页面加载性能
- [ ] **首屏加载**: < 2秒
- [ ] **文章列表**: < 1秒
- [ ] **文章详情**: < 1秒
- [ ] **图片加载**: 懒加载正常

### 2. API响应性能
```bash
# 测试API响应时间
curl -w "@curl-format.txt" -o /dev/null -s \
  http://localhost:3001/api/posts

# curl-format.txt内容:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#           time_total:  %{time_total}\n
```

### 3. 并发测试
```bash
# 使用Apache Bench测试并发
ab -n 100 -c 10 http://localhost:3001/api/posts
```

## ✅ 测试完成标准

### 基础功能 (必须通过)
- [ ] 所有页面正常加载
- [ ] API请求响应正常
- [ ] 管理员功能可用
- [ ] 错误处理正确

### 高级功能 (建议通过)
- [ ] AI功能正常工作
- [ ] 性能指标达标
- [ ] 移动端适配良好
- [ ] 用户体验流畅

## 🐛 问题记录模板

```markdown
### 问题描述
- **功能**: 
- **步骤**: 
- **预期**: 
- **实际**: 
- **错误信息**: 

### 环境信息
- **浏览器**: 
- **操作系统**: 
- **前端版本**: 
- **后端版本**: 

### 解决方案
- **临时方案**: 
- **永久方案**: 
```

---

**🎯 按照此清单逐项测试，确保所有功能正常工作！**
