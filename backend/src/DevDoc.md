# Backend 开发文档

## 功能模块实现

### 1. Post 功能实现

#### 数据库字段设计

| 字段名      | 类型      | 说明         |
| ----------- | --------- | ------------ |
| id          | uint64    | 主键 ID      |
| title       | string    | 文章标题     |
| cover_url   | string    | 封面图片 URL |
| content     | string    | 文章内容     |
| category_id | uint64    | 目录 ID      |
| status      | uint8     | 文章状态     |
| post_images | [string]  | 文章图片     |
| created_at  | timestamp | 创建时间     |
| updated_at  | timestamp | 更新时间     |

#### 文章与目录、标签关系

- **文章与目录**：每个文章只能属于一个目录，通过 category_id 字段关联
- **文章与标签**：每个文章可以有多个标签，通过文章标签关联表(post_tags)实现多对多关系

#### 统一状态定义

| 状态值 | 状态名    | 说明   | 适用模块    |
| ------ | --------- | ------ | ----------- |
| 0      | draft     | 草稿   | Post        |
| 1      | published | 已发布 | Post, Music |
| 2      | deleted   | 已删除 | Post, Music |
| 3      | private   | 私密   | Post        |

#### 核心功能

- **创建 post** - 新增文章
- **获取 post** - 查询文章
- **更新 post** - 修改文章
- **删除 post** - 删除文章

#### Post 图片处理功能

- 处理前端上传的图片文件
- 生成图片 ID
- 生成图片 URL
- 生成图片路径
- 生成图片文件名
- 生成图片文件扩展名

### 2. Music 功能实现

#### 数据库字段设计

| 字段名          | 类型      | 说明         |
| --------------- | --------- | ------------ |
| id              | uint64    | 主键 ID      |
| music_name      | string    | 音乐名称     |
| music_author    | string    | 音乐作者     |
| music_url       | string    | 音乐文件 URL |
| music_cover_url | string    | 音乐封面 URL |
| status          | uint8     | 音乐状态     |
| created_at      | timestamp | 创建时间     |
| updated_at      | timestamp | 更新时间     |

#### 核心功能

- **创建 music** - 新增音乐
- **获取 music** - 查询音乐
- **更新 music** - 修改音乐
- **删除 music** - 删除音乐

#### 音乐上传处理逻辑

- 生成音乐 ID
- 生成音乐 URL
- 生成音乐路径
- 生成音乐文件名
- 生成音乐文件扩展名

### 3. Response 功能实现

#### 基础 Response 结构

包含状态码、消息和数据字段的标准响应格式

#### 基础 Response List 结构

包含状态码、消息和数据列表的标准响应格式

### 4. Admin 功能实现

#### 管理员鉴权

- 鉴权是否为管理员
- 使用 token 登录

### 5. 配置功能实现

#### 配置项详情

##### 数据库配置

数据库连接 URL 配置

**环境变量**: `DATABASE_URL`

##### JWT 配置

JWT 签名密钥和管理员访问令牌配置

**环境变量**:

- `JWT_SECRET` - JWT 签名密钥
- `BLOG_ADMIN_TOKEN` - 管理员访问令牌

##### 服务器配置

服务器主机和端口配置

**环境变量**: `PORT` (默认: 3001)

##### AI 服务配置

DeepSeek API 密钥和地址配置

**环境变量**:

- `DEEPSEEK_API_KEY` - DeepSeek API 密钥
- `DEEPSEEK_API_URL` - DeepSeek API 地址

##### CORS 配置

跨域资源共享配置

**环境变量**: `CORS_ORIGINS` (逗号分隔的域名列表)

##### 存储配置

文件上传目录和大小限制配置

**环境变量**:

- `UPLOAD_DIR` - 文件上传目录
- `BLOG_DATA_DIR` - 博客数据目录
- `MAX_FILE_SIZE` - 最大文件大小 (字节)

## 详细实现逻辑

### 文件处理通用逻辑

#### 文件上传流程

1. **文件验证**

   - 检查文件大小是否超过限制
   - 验证文件类型是否允许
   - 检查文件内容完整性

2. **文件存储**

   - 生成唯一文件名（UUID + 时间戳）
   - 创建存储目录（如果不存在）
   - 保存文件到指定路径
   - 返回文件访问 URL

3. **数据库更新**
   - 记录文件信息到数据库
   - 更新相关记录的 URL 字段

#### 文件更新流程

1. **获取原文件信息**

   - 从数据库查询原文件路径
   - 验证文件是否存在

2. **删除原文件**

   - 检查原文件是否存在
   - 删除原文件（如果存在）
   - 记录删除操作日志

3. **上传新文件**

   - 执行标准文件上传流程
   - 更新数据库记录

4. **错误处理**
   - 如果新文件上传失败，尝试恢复原文件
   - 记录错误日志

#### 文件删除流程

1. **数据库查询**

   - 获取文件路径信息
   - 验证记录存在性

2. **物理文件删除**

   - 检查文件是否存在
   - 删除物理文件
   - 清理空目录

3. **数据库更新**
   - 删除数据库记录
   - 更新相关关联记录

### Post 功能详细实现

#### 创建 Post 实现逻辑

创建 Post 的完整流程包括数据验证、文件处理、数据库记录创建等步骤

#### 更新 Post 实现逻辑

更新 Post 的完整流程包括获取原记录、文件更新处理、数据库记录更新等步骤

#### 删除 Post 实现逻辑

删除 Post 的完整流程包括获取记录、删除相关文件、软删除数据库记录等步骤

### Music 功能详细实现

#### 创建 Music 实现逻辑

创建 Music 的完整流程包括数据验证、音乐文件处理、封面图片处理、数据库记录创建等步骤

#### 更新 Music 实现逻辑

更新 Music 的完整流程包括获取原记录、音乐文件更新、封面图片更新、数据库记录更新等步骤

#### 删除 Music 实现逻辑

删除 Music 的完整流程包括获取记录、删除音乐文件和封面文件、软删除数据库记录等步骤

### Download 功能详细实现

#### 数据库字段设计

| 字段名     | 类型      | 说明     |
| ---------- | --------- | -------- |
| id         | uint64    | 主键 ID  |
| file_name  | string    | 文件名   |
| file_url   | string    | 文件 URL |
| file_type  | string    | 文件类型 |
| file_size  | uint64    | 文件大小 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### 上传文件实现逻辑

上传文件的完整流程包括文件验证、文件信息生成、文件保存、数据库记录创建等步骤

#### 删除文件实现逻辑

删除文件的完整流程包括获取文件记录、删除物理文件、删除数据库记录等步骤

### 错误处理机制

#### 文件操作错误处理

文件操作的安全处理机制，包括错误日志记录和错误类型分类处理

#### 数据库事务处理

数据库事务的安全处理机制，包括事务开始、提交和回滚操作

## API 接口文档

### 认证说明

#### 管理员认证

管理员接口需要在请求头中包含认证 Token

### 公共 API

#### 获取 Post 列表

```
GET /api/post/list
```

**查询参数**:

- `page`: 页码 (可选，默认: 1)
- `page_size`: 每页数量 (可选，默认: 10)
- `category_id`: 目录 ID 过滤 (可选)
- `status`: 状态过滤 (可选)

**响应示例**:
包含状态码、消息和数据列表的标准响应格式

#### 通过 ID 获取 Post

```
GET /api/post/get/:id
```

**路径参数**:

- `id`: Post ID

**响应示例**:
包含状态码、消息和单个 Post 数据的标准响应格式

#### 获取 Music 列表

```
GET /api/music/list
```

**查询参数**:

- `page`: 页码 (可选，默认: 1)
- `page_size`: 每页数量 (可选，默认: 10)
- `status`: 状态过滤 (可选)

**响应示例**:
包含状态码、消息和 Music 数据列表的标准响应格式

#### 通过 ID 获取 Music

```
GET /api/music/get/:id
```

**路径参数**:

- `id`: Music ID

**响应示例**:
包含状态码、消息和单个 Music 数据的标准响应格式

### 管理员 API

#### 创建 Post

```
POST /api/post/create
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含文章标题、封面 URL、内容、目录 ID、文章图片等字段

**响应示例**:
包含状态码、消息和创建的 Post 数据的标准响应格式

#### 上传 Post 图片

```
POST /api/post/upload_post_image
```

**请求头**:
包含认证 Token 和文件上传类型

**请求体**:
包含图片文件

**响应示例**:
包含状态码、消息和图片 URL 信息的标准响应格式

#### 更新 Post

```
PUT /api/post/update/:id
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含可选的更新字段（标题、封面 URL、内容、目录 ID、文章图片等）

**实现逻辑**:

1. 验证 Post 是否存在
2. 如果提供了新的封面图片，删除原封面文件并上传新文件
3. 如果提供了新的文章图片，删除原图片文件并上传新文件
4. 更新数据库记录
5. 返回更新后的 Post 信息

**响应示例**:
包含状态码、消息和更新后的 Post 数据的标准响应格式

#### 更新 Post 封面

```
PUT /api/post/update_cover/:id
```

**请求头**:
包含认证 Token 和文件上传类型

**请求体**:
包含封面文件

**实现逻辑**:

1. 获取原 Post 记录
2. 删除原封面文件（如果存在）
3. 上传新封面文件
4. 更新数据库中的 cover_url 字段
5. 返回更新后的 Post 信息

**响应示例**:
包含状态码、消息和更新后的封面 URL 信息的标准响应格式

#### 删除 Post

```
DELETE /api/post/delete/:id
```

**请求头**:
包含认证 Token

**路径参数**:

- `id`: Post ID

**实现逻辑**:

1. 获取 Post 记录
2. 删除所有相关的图片文件（封面和文章图片）
3. 软删除数据库记录（设置 status 为 2）
4. 返回删除成功信息

**响应示例**:
包含状态码、消息和空数据的标准响应格式

#### 获取文章标签

```
GET /api/post/get_tags/:id
```

**路径参数**:

- `id`: Post ID

**响应示例**:
包含状态码、消息和文章标签列表的标准响应格式

#### 更新文章标签

```
PUT /api/post/update_tags/:id
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含标签 ID 列表

**实现逻辑**:

1. 验证 Post 是否存在
2. 验证所有标签 ID 是否有效
3. 删除原有的标签关联
4. 创建新的标签关联
5. 返回更新后的标签信息

**响应示例**:
包含状态码、消息和更新后的标签列表的标准响应格式

#### 创建 Music

```
POST /api/music/create
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含音乐名称、作者、音乐 URL、封面 URL 等字段

**响应示例**:
包含状态码、消息和创建的 Music 数据的标准响应格式

#### 上传 Music 文件

```
POST /api/music/upload_music
```

**请求头**:
包含认证 Token 和文件上传类型

**请求体**:
包含音乐文件

**响应示例**:
包含状态码、消息和音乐 URL 信息的标准响应格式

#### 上传 Music 封面

```
POST /api/music/upload_music_cover/:id
```

**请求头**:
包含认证 Token 和文件上传类型

**路径参数**:

- `id`: Music ID

**请求体**:
包含封面文件

**实现逻辑**:

1. 获取 Music 记录
2. 删除原封面文件（如果存在）
3. 上传新封面文件
4. 更新数据库中的 music_cover_url 字段
5. 返回更新后的 Music 信息

**响应示例**:
包含状态码、消息和更新后的封面 URL 信息的标准响应格式

#### 更新 Music

```
PUT /api/music/update/:id
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含可选的更新字段

**实现逻辑**:

1. 验证 Music 是否存在
2. 如果提供了新的音乐文件，删除原音乐文件并上传新文件
3. 如果提供了新的封面图片，删除原封面文件并上传新文件
4. 更新数据库记录
5. 返回更新后的 Music 信息

**响应示例**:
包含状态码、消息和更新后的 Music 数据的标准响应格式

#### 删除 Music

```
DELETE /api/music/delete/:id
```

**请求头**:
包含认证 Token

**路径参数**:

- `id`: Music ID

**实现逻辑**:

1. 获取 Music 记录
2. 删除音乐文件和封面文件
3. 软删除数据库记录（设置 status 为 2）
4. 返回删除成功信息

**响应示例**:
包含状态码、消息和空数据的标准响应格式

### Download 功能 API

#### 上传可下载文件

```
POST /api/download/upload_file
```

**请求头**:
包含认证 Token 和文件上传类型

**请求体**:
包含文件

**实现逻辑**:

1. 验证文件类型和大小
2. 生成唯一文件名
3. 保存文件到 download 目录
4. 记录文件信息到数据库
5. 返回文件信息

**响应示例**:
包含状态码、消息和文件信息的标准响应格式

#### 下载文件

```
GET /api/download/download_file/:id
```

**路径参数**:

- `id`: 文件 ID

**实现逻辑**:

1. 根据 ID 获取文件记录
2. 检查文件是否存在
3. 设置适当的响应头（Content-Type, Content-Disposition）
4. 返回文件流

**响应头**:
包含文件类型、下载文件名、文件大小等信息

#### 获取文件列表

```
GET /api/download/get_file_list
```

**查询参数**:

- `page`: 页码 (可选，默认: 1)
- `page_size`: 每页数量 (可选，默认: 10)

**响应示例**:
包含状态码、消息和文件列表数据的标准响应格式

#### 获取文件信息

```
GET /api/download/get_file/:id
```

**路径参数**:

- `id`: 文件 ID

**响应示例**:
包含状态码、消息和单个文件信息的标准响应格式

#### 删除文件

```
DELETE /api/download/delete_file/:id
```

**请求头**:
包含认证 Token

**路径参数**:

- `id`: 文件 ID

**实现逻辑**:

1. 获取文件记录
2. 删除物理文件
3. 删除数据库记录
4. 返回删除成功信息

**响应示例**:
包含状态码、消息和空数据的标准响应格式

### 目录管理功能

#### 数据库字段设计

| 字段名     | 类型      | 说明     |
| ---------- | --------- | -------- |
| id         | uint64    | 主键 ID  |
| name       | string    | 目录名称 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### 目录与文章关系

- 每个文章只能属于一个目录
- 目录可以包含多个文章
- 文章表通过 category_id 字段关联目录表

#### 创建目录

```
POST /api/category/create
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含目录名称字段

**实现逻辑**:

1. 验证目录名称是否重复
2. 创建目录记录
3. 返回创建的目录信息

**响应示例**:
包含状态码、消息和创建的目录数据的标准响应格式

#### 获取所有目录

```
GET /api/category/list
```

**查询参数**:

**响应示例**:
包含状态码、消息和目录列表数据的标准响应格式

#### 更新目录

```
PUT /api/category/update/:id
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含目录名称字段

**实现逻辑**:

1. 验证目录是否存在
2. 检查名称是否与其他目录重复
3. 更新目录信息
4. 返回更新后的目录信息

**响应示例**:
包含状态码、消息和更新后的目录数据的标准响应格式

#### 删除目录

```
DELETE /api/category/delete/:id
```

**请求头**:
包含认证 Token

**路径参数**:

- `id`: 目录 ID

**实现逻辑**:

1. 检查目录是否被文章使用
2. 如果被使用，返回错误信息
3. 如果未被使用，删除目录记录
4. 返回删除成功信息

**响应示例**:
包含状态码、消息和空数据的标准响应格式

### 标签管理功能

#### 数据库字段设计

| 字段名     | 类型      | 说明     |
| ---------- | --------- | -------- |
| id         | uint64    | 主键 ID  |
| name       | string    | 标签名称 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### 标签与文章关系

- 每个文章可以有多个标签
- 每个标签可以关联多个文章
- 通过文章标签关联表(post_tags)实现多对多关系

#### 创建标签

```
POST /api/tag/create
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含标签名称字段

**实现逻辑**:

1. 验证标签名称是否重复
2. 创建标签记录
3. 返回创建的标签信息

**响应示例**:
包含状态码、消息和创建的标签数据的标准响应格式

#### 获取所有标签

```
GET /api/tag/list
```

**查询参数**:

**响应示例**:
包含状态码、消息和标签列表数据的标准响应格式

#### 更新标签

```
PUT /api/tag/update/:id
```

**请求头**:
包含认证 Token 和内容类型

**请求体**:
包含标签名称字段

**实现逻辑**:

1. 验证标签是否存在
2. 更新标签信息
3. 返回更新后的标签信息

**响应示例**:
包含状态码、消息和更新后的标签数据的标准响应格式

#### 删除标签

```
DELETE /api/tag/delete/:id
```

**请求头**:
包含认证 Token

**路径参数**:

- `id`: 标签 ID

**实现逻辑**:

1. 检查标签是否被文章使用
2. 如果被使用，返回错误信息
3. 如果未被使用，删除标签记录
4. 返回删除成功信息

**响应示例**:
包含状态码、消息和空数据的标准响应格式

### 目录和标签详细实现

#### 目录管理实现逻辑

目录管理的完整流程包括数据验证、重复检查、数据库操作等步骤

#### 标签管理实现逻辑

标签管理的完整流程包括数据验证、重复检查、数据库操作等步骤

#### 文章与目录、标签关联

文章与目录、标签关联的完整流程包括验证目录和标签存在性、创建关联记录、更新关联关系等步骤

### 数据库迁移脚本

#### 创建目录表

创建目录表的 SQL 脚本，包含主键、名称、时间戳等字段

#### 创建标签表

创建标签表的 SQL 脚本，包含主键、名称、时间戳等字段

#### 创建文章标签关联表

创建文章标签关联表的 SQL 脚本，包含主键、文章 ID、标签 ID、时间戳等字段

#### 更新文章表

为文章表添加目录 ID 字段的 SQL 脚本

#### 视频上传功能

##### 数据库设计

###### 视频表 (videos)

```sql
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url VARCHAR(500) NOT NULL,
    cover_url VARCHAR(500),
    duration INTEGER, -- 视频时长（秒）
    file_size BIGINT, -- 文件大小（字节）
    format VARCHAR(20), -- 视频格式
    resolution VARCHAR(20), -- 分辨率
    status INTEGER DEFAULT 1, -- 1: 正常, 0: 禁用, 2: 审核中
    category_id INTEGER,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

###### 视频标签关联表 (video_tags)

```sql
CREATE TABLE video_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(video_id, tag_id)
);
```

###### 视频评论表 (video_comments)

```sql
CREATE TABLE video_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER, -- 回复的评论ID
    status INTEGER DEFAULT 1, -- 1: 正常, 0: 隐藏
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES video_comments(id) ON DELETE CASCADE
);
```

##### API 接口设计

###### 1. 视频上传功能

- **POST** `/api/videos/upload`
- **功能**: 上传视频文件
- **请求参数**:

  ```json
  {
    "title": "视频标题",
    "description": "视频描述",
    "category_id": 1,
    "tags": [1, 2, 3],
    "file": "视频文件",
    "cover": "封面图片（可选）"
  }
  ```

- **响应格式**:

  ```json
  {
    "code": 200,
    "message": "视频上传成功",
    "data": {
      "id": 1,
      "title": "视频标题",
      "description": "视频描述",
      "video_url": "https://example.com/videos/video.mp4",
      "cover_url": "https://example.com/covers/cover.jpg",
      "duration": 180,
      "file_size": 10485760,
      "format": "mp4",
      "resolution": "1920x1080",
      "status": 1,
      "category_id": 1,
      "views": 0,
      "likes": 0,
      "comments": 0,
      "shares": 0,
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    }
  }
  ```

###### 2. 视频列表功能

- **GET** `/api/videos`
- **功能**: 获取视频列表
- **查询参数**:
  - `page`: 页码（默认 1）
  - `limit`: 每页数量（默认 10）
  - `category_id`: 分类 ID
  - `tag_id`: 标签 ID
  - `status`: 状态筛选
  - `sort`: 排序方式（views, likes, created_at）
  - `order`: 排序顺序（asc, desc）
- **响应格式**:

  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "videos": [
        {
          "id": 1,
          "title": "视频标题",
          "description": "视频描述",
          "video_url": "https://example.com/videos/video.mp4",
          "cover_url": "https://example.com/covers/cover.jpg",
          "duration": 180,
          "views": 100,
          "likes": 50,
          "comments": 20,
          "shares": 10,
          "category": {
            "id": 1,
            "name": "分类名称"
          },
          "tags": [
            { "id": 1, "name": "标签1" },
            { "id": 2, "name": "标签2" }
          ],
          "created_at": "2024-01-01 12:00:00"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 100,
        "total_pages": 10
      }
    }
  }
  ```

###### 3. 视频详情功能

- **GET** `/api/videos/{id}`
- **功能**: 获取视频详细信息
- **响应格式**:

  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "title": "视频标题",
      "description": "视频描述",
      "video_url": "https://example.com/videos/video.mp4",
      "cover_url": "https://example.com/covers/cover.jpg",
      "duration": 180,
      "file_size": 10485760,
      "format": "mp4",
      "resolution": "1920x1080",
      "status": 1,
      "views": 100,
      "likes": 50,
      "comments": 20,
      "shares": 10,
      "category": {
        "id": 1,
        "name": "分类名称"
      },
      "tags": [
        { "id": 1, "name": "标签1" },
        { "id": 2, "name": "标签2" }
      ],
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    }
  }
  ```

###### 4. 视频删除功能

- **DELETE** `/api/videos/{id}`
- **功能**: 删除视频
- **响应格式**:

  ```json
  {
    "code": 200,
    "message": "视频删除成功",
    "data": null
  }
  ```

###### 5. 视频编辑功能

- **PUT** `/api/videos/{id}`
- **功能**: 更新视频信息
- **请求参数**:

  ```json
  {
    "title": "新标题",
    "description": "新描述",
    "category_id": 2,
    "tags": [1, 2, 3],
    "status": 1
  }
  ```

- **响应格式**:

  ```json
  {
    "code": 200,
    "message": "视频更新成功",
    "data": {
      "id": 1,
      "title": "新标题",
      "description": "新描述",
      "updated_at": "2024-01-01 12:00:00"
    }
  }
  ```

###### 6. 视频搜索功能

- **GET** `/api/videos/search`
- **功能**: 搜索视频
- **查询参数**:
  - `q`: 搜索关键词
  - `page`: 页码
  - `limit`: 每页数量
- **响应格式**: 同视频列表

###### 7. 视频分类功能

- **GET** `/api/videos/categories/{category_id}`
- **功能**: 获取指定分类的视频
- **响应格式**: 同视频列表

###### 8. 视频标签功能

- **GET** `/api/videos/tags/{tag_id}`
- **功能**: 获取指定标签的视频
- **响应格式**: 同视频列表

###### 9. 视频评论功能

- **POST** `/api/videos/{id}/comments`
- **功能**: 添加视频评论
- **请求参数**:

  ```json
  {
    "content": "评论内容",
    "parent_id": null
  }
  ```

- **响应格式**:

  ```json
  {
    "code": 200,
    "message": "评论添加成功",
    "data": {
      "id": 1,
      "content": "评论内容",
      "user_id": 1,
      "parent_id": null,
      "created_at": "2024-01-01 12:00:00"
    }
  }
  ```

###### 10. 视频点赞功能

- **POST** `/api/videos/{id}/like`
- **功能**: 点赞/取消点赞视频
- **响应格式**:

  ```json
  {
    "code": 200,
    "message": "操作成功",
    "data": {
      "liked": true,
      "likes_count": 51
    }
  }
  ```

##### 错误处理

###### 常见错误码

- `400`: 请求参数错误
- `401`: 未授权访问
- `403`: 权限不足
- `404`: 视频不存在
- `413`: 文件过大
- `415`: 不支持的文件格式
- `500`: 服务器内部错误

###### 错误响应格式

```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

##### 日志记录

###### 日志级别

- **INFO**: 视频上传、删除、编辑等操作
- **WARN**: 文件格式不支持、文件过大等警告
- **ERROR**: 上传失败、数据库错误等

###### 日志内容

- 操作类型
- 用户 ID
- 视频 ID
- 操作时间
- 错误详情（如有）

##### 性能优化

###### 文件处理优化

- 支持断点续传
- 文件分片上传
- 异步处理大文件
- 视频压缩和转码

###### 数据库优化

- 索引优化
- 查询缓存
- 分页优化
- 连接池管理

###### CDN 加速

- 视频文件 CDN 分发
- 静态资源缓存
- 地理位置优化

##### 安全措施

###### 文件上传安全

- 文件类型验证
- 文件大小限制
- 文件名安全处理
- 病毒扫描

###### 访问控制

- 用户身份验证
- 权限检查
- 内容审核
- 防盗链保护

###### 数据安全

- 敏感信息加密
- SQL 注入防护
- XSS 攻击防护
- CSRF 防护

##### 测试用例

###### 单元测试

- 视频模型测试
- 服务层测试
- 控制器测试

###### 集成测试

- API 接口测试
- 文件上传测试
- 数据库操作测试

###### 性能测试

- 并发上传测试
- 大文件处理测试
- 数据库性能测试

##### 文档

###### API 文档

- 接口说明
- 参数说明
- 响应格式
- 错误码说明

###### 部署文档

- 环境要求
- 安装步骤
- 配置说明
- 启动命令

##### 部署

###### 环境要求

- Rust 1.70+
- SQLite 3.x
- 足够的存储空间
- 网络带宽

###### 部署步骤

1. 编译项目
2. 配置环境变量
3. 初始化数据库
4. 启动服务

##### 维护

###### 日常维护

- 日志监控
- 性能监控
- 错误监控
- 备份管理

###### 更新维护

- 功能更新
- 安全补丁
- 性能优化
- 兼容性维护

##### 更新

###### 版本管理

- 语义化版本号
- 更新日志
- 回滚机制
- 兼容性检查

###### 更新流程

1. 代码审查
2. 测试验证
3. 灰度发布
4. 全量发布
