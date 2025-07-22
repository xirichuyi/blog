# 保存为 install_tools.ps1 并运行
param(
    [string]$Method = "msvc"  # 可选: "msvc" 或 "gnu"
)

Write-Host "正在安装 Rust 编译工具..." -ForegroundColor Cyan

if ($Method -eq "msvc") {
    Write-Host "选择 MSVC 工具链..." -ForegroundColor Yellow
    
    # 切换到 MSVC
    rustup default stable-x86_64-pc-windows-msvc
    
    # 下载并安装 Visual Studio Build Tools
    $url = "https://aka.ms/vs/17/release/vs_buildtools.exe"
    $installer = "$env:TEMP\vs_buildtools.exe"
    
    Write-Host "下载 Visual Studio Build Tools..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $url -OutFile $installer
    
    Write-Host "安装 Build Tools（需要几分钟）..." -ForegroundColor Yellow
    Start-Process -FilePath $installer -ArgumentList "--quiet", "--wait", "--add", "Microsoft.VisualStudio.Workload.VCTools", "--includeRecommended" -Wait
    
} elseif ($Method -eq "gnu") {
    Write-Host "选择 GNU 工具链..." -ForegroundColor Yellow
    
    # 切换到 GNU
    rustup default stable-x86_64-pc-windows-gnu
    
    # 安装 MSYS2
    Write-Host "安装 MSYS2..." -ForegroundColor Yellow
    winget install MSYS2.MSYS2 --silent
    
    # 添加到 PATH
    $newPath = ";C:\msys64\mingw64\bin;C:\msys64\usr\bin"
    $env:PATH += $newPath
    [Environment]::SetEnvironmentVariable("PATH", $env:PATH + $newPath, "User")
}

Write-Host "安装完成！请重启 PowerShell 并重新编译项目。" -ForegroundColor Green