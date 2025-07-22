@echo off
echo ========================================
echo        启动 Cyrus Blog 后端服务器
echo ========================================
echo.

:: 进入后端目录
cd /d "%~dp0backend"

:: 检查 .env 文件
if not exist ".env" (
    echo 错误: 未找到 .env 文件
    echo 请确保 backend\.env 文件存在
    pause
    exit /b 1
)

:: 创建数据目录
if not exist "data" (
    mkdir data
    echo 已创建数据目录
)

echo 正在启动后端服务器...
echo API 地址: http://localhost:3001/api
echo 管理员 Token: admin123456
echo.
echo 按 Ctrl+C 停止服务器
echo.

:: 启动后端
cargo run

pause
