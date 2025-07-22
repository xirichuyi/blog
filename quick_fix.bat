@echo off
echo ========================================
echo     Cyrus Blog 编译问题快速修复
echo ========================================
echo.

echo 检测到编译错误，这通常是因为缺少 Visual Studio Build Tools
echo.

echo 解决方案选择：
echo.
echo 1. 安装 Visual Studio Build Tools (推荐)
echo 2. 切换到 GNU 工具链 (替代方案)
echo 3. 查看详细说明
echo 4. 退出
echo.

set /p choice=请选择 (1-4): 

if "%choice%"=="1" goto install_buildtools
if "%choice%"=="2" goto switch_gnu
if "%choice%"=="3" goto show_help
if "%choice%"=="4" goto exit

:install_buildtools
echo.
echo 正在打开 Visual Studio Build Tools 下载页面...
start https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
echo.
echo 请按照以下步骤操作：
echo 1. 下载并运行 vs_buildtools.exe
echo 2. 选择 "C++ build tools" 工作负载
echo 3. 确保勾选 MSVC v143 和 Windows 11 SDK
echo 4. 安装完成后重启命令行
echo 5. 重新运行项目启动脚本
echo.
pause
goto exit

:switch_gnu
echo.
echo 正在切换到 GNU 工具链...
echo.

rustup toolchain install stable-x86_64-pc-windows-gnu
if errorlevel 1 (
    echo 安装 GNU 工具链失败
    pause
    goto exit
)

rustup default stable-x86_64-pc-windows-gnu
if errorlevel 1 (
    echo 设置默认工具链失败
    pause
    goto exit
)

echo.
echo ✅ 已切换到 GNU 工具链
echo 正在清理编译缓存...

cd backend
cargo clean
echo.
echo 正在重新编译...
cargo build
if errorlevel 1 (
    echo 编译仍然失败，建议安装 Visual Studio Build Tools
    pause
    goto exit
) else (
    echo ✅ 编译成功！
    echo 现在可以运行项目了
    pause
    cargo run
)
goto exit

:show_help
echo.
echo 打开详细说明文档...
start fix_build_tools.md
pause
goto exit

:exit
echo.
echo 脚本结束
