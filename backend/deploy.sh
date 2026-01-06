#!/bin/bash
# 生产环境部署脚本

set -e

echo "=== 博客后端部署脚本 ==="

# 检查 Rust 是否安装
if ! command -v cargo &> /dev/null; then
    echo "正在安装 Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# 安装编译依赖 (Ubuntu/Debian)
if command -v apt-get &> /dev/null; then
    echo "安装编译依赖..."
    sudo apt-get update
    sudo apt-get install -y build-essential pkg-config libssl-dev
fi

# 安装编译依赖 (CentOS/RHEL)
if command -v yum &> /dev/null; then
    echo "安装编译依赖..."
    sudo yum groupinstall -y "Development Tools"
    sudo yum install -y openssl-devel
fi

# 创建必要目录
echo "创建数据目录..."
mkdir -p data
mkdir -p uploads/images
mkdir -p uploads/covers
mkdir -p uploads/music
mkdir -p uploads/music_covers
mkdir -p uploads/pdfs
mkdir -p uploads/downloads

# 编译 release 版本
echo "编译 release 版本..."
cargo build --release

# 显示编译结果
echo ""
echo "=== 编译完成 ==="
echo "可执行文件: target/release/chuyi-uk-back"
echo ""
echo "启动命令:"
echo "  ./target/release/chuyi-uk-back"
echo ""
echo "或使用 nohup 后台运行:"
echo "  nohup ./target/release/chuyi-uk-back > server.log 2>&1 &"
echo ""
echo "使用 systemd 服务 (推荐):"
echo "  sudo cp blog-backend.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable blog-backend"
echo "  sudo systemctl start blog-backend"
