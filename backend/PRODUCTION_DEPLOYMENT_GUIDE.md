# 🚀 Production Deployment Guide

## ⚠️ Security Requirements

### 1. Environment Variables (REQUIRED)

Create a `.env` file with the following **REQUIRED** variables:

```bash
# Database Configuration
DATABASE_URL=sqlite:./data/blog.db

# Server Configuration
HOST=0.0.0.0
PORT=3006

# Authentication - CRITICAL: Use strong secrets!
# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-CHANGE-THIS
BLOG_ADMIN_TOKEN=your-secret-admin-token-min-32-chars-CHANGE-THIS

# CORS Configuration - Add your domain(s)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# AI Service (Optional)
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# Logging
RUST_LOG=info,cyrus_blog_backend=info

# File Storage
UPLOAD_DIR=./uploads
BLOG_DATA_DIR=./data/blog
MAX_FILE_SIZE=10485760
```

### 2. Security Checklist

- [ ] **Strong JWT_SECRET**: Minimum 32 characters, cryptographically secure
- [ ] **Strong BLOG_ADMIN_TOKEN**: Minimum 32 characters, unique
- [ ] **CORS_ORIGINS**: Only include your actual domain(s)
- [ ] **HOST**: Set to `0.0.0.0` for production
- [ ] **File permissions**: Ensure upload directories have proper permissions
- [ ] **Database**: Secure SQLite file location and permissions

### 3. Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate admin token
openssl rand -base64 32
```

## 🔧 Deployment Steps

### 1. Build for Production

```bash
cargo build --release
```

### 2. Set Environment Variables

```bash
export JWT_SECRET="your-generated-secret"
export BLOG_ADMIN_TOKEN="your-generated-token"
export CORS_ORIGINS="https://yourdomain.com"
```

### 3. Run the Server

```bash
./target/release/cyrus_blog_backend
```

## 🛡️ Security Features

### ✅ Implemented Security Measures

1. **CORS Protection**: Configurable allowed origins
2. **Authentication**: Bearer token authentication for admin routes
3. **File Upload Security**:
   - File type validation
   - File size limits
   - Path traversal attack prevention
   - Unique file naming (UUID + timestamp)
4. **SQL Injection Prevention**: All queries use parameterized statements
5. **Production Environment Checks**: Panics if secrets not set in production
6. **Secure Defaults**: Development vs production configuration separation

### 🔒 Additional Recommendations

1. **Reverse Proxy**: Use nginx or similar for HTTPS termination
2. **Firewall**: Restrict access to necessary ports only
3. **Monitoring**: Set up logging and monitoring
4. **Backups**: Regular database backups
5. **Updates**: Keep dependencies updated

## 🚨 Common Security Mistakes to Avoid

1. ❌ Using default/weak secrets
2. ❌ Setting CORS to allow all origins (`*`)
3. ❌ Running as root user
4. ❌ Exposing database files publicly
5. ❌ Not setting up HTTPS
6. ❌ Using debug logging in production

## 📊 Health Checks

The server provides health check endpoints:

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system health
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## 🔧 Configuration Validation

The server will:
- ✅ Panic on startup if JWT_SECRET is not set in production
- ✅ Panic on startup if BLOG_ADMIN_TOKEN is not set in production
- ✅ Warn if CORS_ORIGINS is not set in production
- ✅ Use secure defaults for development vs production

## 📝 Logging

Set appropriate log levels:
- **Development**: `RUST_LOG=debug`
- **Production**: `RUST_LOG=info,cyrus_blog_backend=info`

---

**⚠️ IMPORTANT**: Never commit `.env` files or secrets to version control!
