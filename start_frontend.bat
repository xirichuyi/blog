@echo off
echo ========================================
echo        启动 Cyrus Blog 前端服务器
echo ========================================
echo.

:: 进入前端目录
cd /d "%~dp0frontend-new"

:: 检查 .env 文件
if not exist ".env" (
    echo 错误: 未找到 .env 文件
    echo 请确保 frontend-new\.env 文件存在
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if errorlevel 1 (
        echo 依赖安装失败
        pause
        exit /b 1
    )
)

echo 正在启动前端服务器...
echo 前端地址: http://localhost:3000
echo.
echo 按 Ctrl+C 停止服务器
echo.

:: 启动前端
npm run dev

pause
