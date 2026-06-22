# CI/CD 部署说明

推送到 `main` 分支即自动构建并部署到 Sigma 服务器（`152.69.199.25`，Ubuntu 24.04）。

## 流水线（`.github/workflows/deploy.yml`）

| Job | 内容 |
|-----|------|
| `build-frontend` | `npm ci` + `vite build`（生产模式，同源 `/api`），产物 `frontend/dist` |
| `build-backend` | 在 `ubuntu-22.04`（glibc 2.35）上 `cargo build --release --locked`，产物二进制 `chuyi-uk-back` |
| `deploy` | rsync 前端 dist → nginx 根目录；上传二进制（临时名→原子 `mv`）→ `sudo systemctl restart blog-backend`；轮询 `/api/health` 直到 200 |

触发方式：push 到 `main`，或 Actions 页面手动 `workflow_dispatch`。

## GitHub Secrets（已配置）

| Secret | 值 |
|--------|-----|
| `SSH_HOST` | `152.69.199.25` |
| `SSH_USER` | `ubuntu` |
| `SSH_PRIVATE_KEY` | 专用部署私钥（公钥已加入服务器 `~/.ssh/authorized_keys`） |

## 服务器布局（已初始化）

```
/var/www/blog/
├── backend/
│   ├── target/release/chuyi-uk-back   # 部署上传的二进制
│   ├── data/blog.db                   # SQLite（迁移自动建表，勿覆盖）
│   ├── uploads/                       # 用户上传文件（勿覆盖）
│   └── .env                           # 密钥/配置（chmod 600，勿提交）
└── frontend/dist/                     # 前端静态文件（nginx 根目录）
```

- **systemd**：`/etc/systemd/system/blog-backend.service`（`User=ubuntu`，`EnvironmentFile=.env`，沙箱加固）。后端监听 `127.0.0.1:3006`。
- **nginx**：`/etc/nginx/sites-available/blog.chuyi.uk` → `server_name blog.chuyi.uk`，`/api/` 和 `/uploads/` 反代到后端，其余走 SPA 静态文件。
- `.env` 里的 `JWT_SECRET` / `BLOG_ADMIN_TOKEN` 在服务器本地用 `openssl rand -base64 32` 生成，**不在仓库/CI 中**。`DEEPSEEK_API_KEY` 留空（AI 功能未启用，需要时直接编辑 `.env` 后 `sudo systemctl restart blog-backend`）。

## HTTPS

域名 `blog.chuyi.uk` 走 Cloudflare 代理，采用 **Cloudflare Origin 证书**（Full/strict）：

- 证书/私钥在服务器 `/etc/ssl/blog.chuyi.uk/{origin.crt,origin.key}`（`origin.key` chmod 600，**不在仓库**），有效期至 2041。
- nginx vhost `blog.chuyi.uk-ssl`：80 端口 301 跳转到 443；443 用 Origin 证书，反代规则同上。
- Cloudflare 侧：`blog.chuyi.uk` DNS A 记录指向 `152.69.199.25`（橙云代理），SSL/TLS 模式 Full (strict)。
- 续期：Origin 证书 15 年有效，到期前在 CF 重新生成并替换 `origin.crt`/`origin.key` 后 `sudo systemctl reload nginx`。

## 常用运维

```bash
# 查看后端状态/日志
sudo systemctl status blog-backend
journalctl -u blog-backend -f

# 手动重启
sudo systemctl restart blog-backend

# 改配置后重启
nano /var/www/blog/backend/.env && sudo systemctl restart blog-backend
```
