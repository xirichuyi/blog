# Google 登录配置

博客后台使用 Google OAuth 2.0 的 Web Server Authorization Code 流程。浏览器只接触
Google 回调，授权码由 Rust 后端交换；登录成功后使用 `HttpOnly`、`SameSite=Lax`
Cookie 保存七天会话。

## Google Cloud Console

1. 打开 Google Cloud Console 的 **Google Auth Platform**。
2. 创建或选择项目，完成 Branding 与 Audience。个人博客可以先使用 Testing，
   并把自己的 Google 账号添加为 Test user。Authorized domains 填写 `chuyi.uk`。
3. 在 Clients 中创建 **Web application** OAuth Client。
4. Authorized redirect URI 必须精确填写：

   ```text
   https://blog.chuyi.uk/api/auth/google/callback
   ```

   协议、域名、路径和末尾斜杠都必须完全一致。
5. 保存 Client ID 和 Client secret。不要把 secret 提交到 Git。

后台只请求 `openid email profile`，用于取得 Google 账号 ID、已验证邮箱、名字和头像，
不会申请 Gmail、Drive 等权限。

## 服务器环境变量

```text
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=https://blog.chuyi.uk/api/auth/google/callback
GOOGLE_ALLOWED_EMAILS=xrcy123@gmail.com
JWT_SECRET=<至少 32 字节的随机值>
```

多个管理员邮箱以英文逗号分隔。只有邮箱已经由 Google 验证且精确出现在白名单中时，
后端才会签发后台会话。修改环境变量后重启服务。

`BLOG_ADMIN_TOKEN` 仍可作为服务器脚本或故障恢复用途，但网页端不再保存或要求该令牌。

## 官方资料

- [Google Web Server OAuth 2.0](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google OpenID Connect UserInfo](https://developers.google.com/identity/openid-connect/reference)
