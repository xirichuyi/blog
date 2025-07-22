@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo    Cyrus Blog Project Startup Script
echo ========================================
echo.

:: 获取当前目录
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo [1/6] 检查环境...
echo.

:: 检查 Rust
rustc --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Rust
    echo    请先安装 Rust: https://rustup.rs/
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Rust 已安装
)

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js
    echo    请先安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Node.js 已安装
)

:: 检查 Visual Studio Build Tools
link.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️  警告: 未找到 Visual Studio Build Tools
    echo    如果编译失败，请安装 Build Tools for Visual Studio
    echo.
) else (
    echo ✅ Visual Studio Build Tools 已安装
)

echo.
echo [2/6] 设置后端环境...
echo.

:: 创建数据目录
if not exist "backend\data" (
    mkdir "backend\data" 2>nul
    echo ✅ 创建数据目录: backend\data
) else (
    echo ✅ 数据目录已存在
)

:: 检查后端 .env 文件
if not exist "backend\.env" (
    echo ❌ 错误: 未找到 backend\.env 文件
    echo    文件已自动创建，请检查配置
    echo.
    pause
    exit /b 1
) else (
    echo ✅ 后端配置文件已存在
)

echo.
echo [3/6] 设置前端环境...
echo.

:: 检查前端 .env 文件
if not exist "frontend-new\.env" (
    echo ❌ 错误: 未找到 frontend-new\.env 文件
    echo    文件已自动创建，请检查配置
    echo.
    pause
    exit /b 1
) else (
    echo ✅ 前端配置文件已存在
)

:: 检查 node_modules
if not exist "frontend-new\node_modules" (
    echo 📦 安装前端依赖...
    cd frontend-new
    npm install
    if errorlevel 1 (
        echo ❌ 错误: 前端依赖安装失败
        echo.
        pause
        exit /b 1
    )
    cd ..
    echo ✅ 前端依赖安装完成
) else (
    echo ✅ 前端依赖已安装
)

echo.
echo [4/6] 检查后端编译...
echo.

cd backend
echo 🔧 检查 Rust 代码编译...
cargo check --quiet
if errorlevel 1 (
    echo ❌ 错误: 后端代码编译失败
    echo    请检查上面的错误信息
    echo.
    pause
    exit /b 1
) else (
    echo ✅ 后端代码编译成功
)
cd ..

echo.
echo [5/6] 准备启动服务...
echo.

echo 🚀 即将启动后端服务器...
echo    API 地址: http://localhost:3001/api
echo    管理员 Token: admin123456
echo.
echo 📝 启动后端后，请在新的命令行窗口中运行:
echo    cd frontend-new
echo    npm run dev
echo.
echo 🌐 然后访问前端: http://localhost:3000
echo.
echo ⏹️  按 Ctrl+C 停止服务器
echo.

echo [6/6] 启动后端服务器...
echo.

cd backend
cargo run
