#!/usr/bin/env python3
"""
render_worker.py — 用 Playwright 渲染单个 URL，把执行完 JS 的 DOM 打到 stdout。

被 gitbook2epub.py 以子进程方式调用（每次渲染一个进程，便于并发隔离）。
独立运行：  python3 render_worker.py <url> [wait_ms]

依赖（服务器一次性安装）：
    pip install playwright
    playwright install chromium          # 下载浏览器
    playwright install-deps chromium     # Linux 上装系统依赖（需 sudo）
"""
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: render_worker.py <url> [wait_ms]", file=sys.stderr)
        return 2
    url = sys.argv[1]
    wait_ms = int(sys.argv[2]) if len(sys.argv) > 2 else 6000

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright 未安装：pip install playwright && playwright install chromium",
              file=sys.stderr)
        return 3

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            )
            page = browser.new_page(
                user_agent="Mozilla/5.0 (gitbook2epub render_worker)"
            )
            # 先等网络基本空闲，再额外等一会让异步内容/懒加载图片就位
            page.goto(url, wait_until="networkidle", timeout=max(30000, wait_ms + 15000))
            page.wait_for_timeout(min(wait_ms, 15000))
            html = page.content()
            browser.close()
    except Exception as e:  # 渲染失败：非 0 退出，主程序据此判断
        print(f"render error: {e}", file=sys.stderr)
        return 1

    sys.stdout.write(html)
    return 0


if __name__ == "__main__":
    sys.exit(main())
