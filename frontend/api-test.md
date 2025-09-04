# API路径修复总结

## 已修复的问题

### 1. 端口配置
- **修复前**: `http://127.0.0.1:3007`
- **修复后**: `http://127.0.0.1:3006`
- **位置**: `frontend/src/services/api.ts` 第8行

### 2. 管理员认证
- **问题**: 前端调用 `/admin/login` 但后端没有此接口
- **修复**: 改为使用固定Token认证机制
- **Token**: `dev-admin-token-not-for-production`
- **登录凭据**: 用户名 `admin`, 密码 `dev-admin-token-not-for-production`

### 3. 文件上传路径
- **修复前**: `/admin/upload`
- **修复后**: `/download/upload_file`
- **说明**: 使用后端实际存在的文件上传接口

### 4. Token验证
- **修复前**: `/admin/verify`
- **修复后**: 使用 `/health` 接口进行简单验证

### 5. Dashboard统计
- **修复前**: `/admin/dashboard`
- **修复后**: 通过调用 `/post/list` 和 `/music/list` 来模拟统计数据

### 6. 文章发布/取消发布
- **修复前**: `/admin/posts/${id}/publish` 和 `/admin/posts/${id}/unpublish`
- **修复后**: 使用 `/post/update/${id}` 接口修改status字段

## 后端API路径对照表

### 公共接口 (无需认证)
- `GET /api/health` - 健康检查
- `GET /api/post/list` - 获取文章列表
- `GET /api/post/get/:id` - 获取单篇文章
- `GET /api/music/list` - 获取音乐列表
- `GET /api/music/get/:id` - 获取单个音乐
- `GET /api/category/list` - 获取分类列表
- `GET /api/tag/list` - 获取标签列表
- `GET /api/about/get` - 获取关于页面

### 管理员接口 (需要Token认证)
- `POST /api/post/create` - 创建文章
- `PUT /api/post/update/:id` - 更新文章
- `DELETE /api/post/delete/:id` - 删除文章
- `POST /api/post/upload_post_image` - 上传文章图片
- `PUT /api/post/update_cover/:id` - 更新文章封面
- `POST /api/music/create` - 创建音乐
- `PUT /api/music/update/:id` - 更新音乐
- `DELETE /api/music/delete/:id` - 删除音乐
- `POST /api/music/upload_music` - 上传音乐文件
- `POST /api/music/upload_cover` - 上传音乐封面
- `POST /api/download/upload_file` - 上传下载文件
- `POST /api/category/create` - 创建分类
- `PUT /api/category/update/:id` - 更新分类
- `DELETE /api/category/delete/:id` - 删除分类
- `POST /api/tag/create` - 创建标签
- `PUT /api/tag/update/:id` - 更新标签
- `DELETE /api/tag/delete/:id` - 删除标签

## 认证说明
后端使用固定Token认证，不是传统的用户名密码登录：
- 请求头格式: `Authorization: Bearer dev-admin-token-not-for-production`
- 前端登录: 用户名 `admin`, 密码 `dev-admin-token-not-for-production`

## 测试建议
1. 启动后端服务 (端口3006)
2. 启动前端服务
3. 访问 `/admin/login` 使用上述凭据登录
4. 测试文章创建、图片上传等功能
5. 检查网络请求是否使用正确的API路径
