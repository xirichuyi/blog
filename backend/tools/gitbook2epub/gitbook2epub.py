#!/usr/bin/env python3
"""
gitbook2epub — 把一本在线 gitbook / bookdown 电子书抓取并打包成单个 EPUB。

只依赖 Python 标准库 + 外部命令 `pandoc`。

用法示例：
    ./gitbook2epub.py https://otexts.com/fppcn/index.html -o fppcn.epub
    ./gitbook2epub.py https://otexts.com/fpp3/ --title "FPP3" --workers 16
    ./gitbook2epub.py <url> --no-images --limit 5     # 快速测试

设计目标是健壮：下载会重试，单页/单图失败不会让整本书失败，
所有产物缓存到本地目录，重复运行很快。
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import gzip
import hashlib
import html as html_mod
import ipaddress
import os
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urljoin, urlparse

UA = "Mozilla/5.0 (gitbook2epub; +https://otexts.com)"
IMG_EXT_RE = re.compile(r"\.(png|jpe?g|gif|svg|webp|bmp)(\?|$)", re.I)

# 渲染 SPA 用的无头浏览器后端。优先 Playwright（服务器/CI 首选，自带浏览器、
# 等待控制好），找不到则退回系统 Chromium 的 --dump-dom。每次渲染都走独立子进程，
# 因此可以安全地并发。
RENDER_WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "render_worker.py")
CHROME_NAMES = ("google-chrome", "google-chrome-stable", "chromium",
                "chromium-browser", "chrome", "msedge")
CHROME_CANDIDATES = [  # macOS 本地开发时的兜底路径
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
]


def have_playwright() -> bool:
    try:
        import importlib.util
        return importlib.util.find_spec("playwright") is not None
    except Exception:
        return False


def find_chrome() -> str | None:
    for name in CHROME_NAMES:
        p = shutil.which(name)
        if p:
            return p
    for p in CHROME_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def _run_live(cmd: list[str], desc: str) -> bool:
    """执行命令并把输出直接透传给用户（用于展示下载进度）。"""
    print(f"· {desc} …")
    try:
        return subprocess.run(cmd).returncode == 0
    except Exception as e:  # noqa: BLE001
        print(f"  ! {desc} 失败：{e}", file=sys.stderr)
        return False


def ensure_playwright(auto_install: bool) -> bool:
    """确保 Playwright 及其 Chromium 浏览器可用；auto_install 时自动安装。"""
    import importlib
    if not have_playwright():
        if not auto_install:
            return False
        print("· 未检测到 Playwright，开始自动安装（首次较慢，会下载浏览器）")
        if not _run_live([sys.executable, "-m", "pip", "install", "playwright"],
                         "pip install playwright"):
            print("  ! pip 安装失败。若是系统 Python，建议在 venv 里安装，或手动：\n"
                  "    pip install playwright && playwright install chromium",
                  file=sys.stderr)
            return False
        importlib.invalidate_caches()
        if not have_playwright():
            return False
    # 下载/校验 Chromium 浏览器（幂等，已装则秒回）
    _run_live([sys.executable, "-m", "playwright", "install", "chromium"],
              "playwright install chromium")
    # 真正启动一次浏览器：headless 服务器常见"浏览器装了但缺系统库无法启动"，
    # 必须实测才能判定可用（否则 --setup 会误报成功，真跑时才崩）。
    if render_fetch("about:blank", "playwright", None, wait_ms=800, timeout=60) is None:
        print("  ! Chromium 已安装但无法启动，通常是缺系统库。Linux 上执行：\n"
              "    sudo python3 -m playwright install-deps chromium", file=sys.stderr)
        return False
    return True


def ensure_render_backend(auto_install: bool) -> tuple[str, str | None] | tuple[None, None]:
    """解析渲染后端：优先 Playwright（必要时自动安装），否则退回系统 Chromium。"""
    if ensure_playwright(auto_install) and os.path.exists(RENDER_WORKER):
        return "playwright", None
    chrome = find_chrome()
    if chrome:
        print("· 未用上 Playwright，改用系统 Chromium 渲染", file=sys.stderr)
        return "chrome", chrome
    return None, None


def render_fetch(url: str, backend: str, chrome: str | None,
                 wait_ms: int = 6000, timeout: int = 90) -> str | None:
    """用无头浏览器渲染页面，返回执行 JS 之后的完整 DOM。"""
    if backend == "playwright":
        cmd = [sys.executable, RENDER_WORKER, url, str(wait_ms)]
    else:
        cmd = [chrome, "--headless=new", "--disable-gpu", "--no-sandbox",
               "--hide-scrollbars", "--no-first-run", "--disable-extensions",
               f"--virtual-time-budget={wait_ms}", "--dump-dom", url]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        print(f"  ! 渲染超时 {url}", file=sys.stderr)
        return None
    out = r.stdout.strip()
    if (r.returncode != 0 or not out) and backend == "chrome":
        cmd[1] = "--headless"  # 退回旧版无头参数再试一次
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            out = r.stdout.strip()
        except subprocess.TimeoutExpired:
            return None
    if not out:
        print(f"  ! 渲染无输出 {url}  {r.stderr.strip()[:160]}", file=sys.stderr)
        return None
    return out


# --------------------------------------------------------------------------- #
# 网络
# --------------------------------------------------------------------------- #
# --------------------------------------------------------------------------- #
# SSRF 防护：只允许抓取解析到公网地址的 http(s) URL。
# 这是服务端在线工具的必需防线——Rust 入口已做一次校验，但真正发起请求的是本
# 进程，且会跟随 30x 跳转，因此每个 URL（含跳转目标、图片、章节页）都要再校验，
# 防止跳转/DNS 改写指向 127.0.0.1 / 10.x / 169.254.169.254 等内网与云元数据。
# --------------------------------------------------------------------------- #
class SSRFError(Exception):
    pass


def _guard_url(url: str) -> None:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise SSRFError(f"blocked non-http url: {url}")
    host = p.hostname
    if not host:
        raise SSRFError(f"blocked url without host: {url}")
    port = p.port or (443 if p.scheme == "https" else 80)
    try:
        infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise SSRFError(f"cannot resolve host {host}: {e}")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_multicast or ip.is_reserved or ip.is_unspecified):
            raise SSRFError(f"blocked non-public address {ip} for host {host}")


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """跟随跳转前，对新目标再做一次 SSRF 校验。"""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _guard_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_SAFE_OPENER = urllib.request.build_opener(_SafeRedirectHandler)


def fetch(url: str, *, binary: bool = False, retries: int = 3,
          timeout: int = 30) -> bytes | str | None:
    """抓取一个 URL，失败重试（指数退避）。返回 None 表示彻底失败。"""
    last = None
    for attempt in range(retries):
        try:
            _guard_url(url)
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, "Accept-Encoding": "gzip"}
            )
            with _SAFE_OPENER.open(req, timeout=timeout) as resp:
                data = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    data = gzip.decompress(data)
            if binary:
                return data
            return data.decode("utf-8", errors="replace")
        except (urllib.error.URLError, urllib.error.HTTPError,
                TimeoutError, ConnectionError, OSError) as e:
            last = e
            if attempt < retries - 1:
                time.sleep(0.5 * (2 ** attempt))
    print(f"  ! 抓取失败 {url}  ({last})", file=sys.stderr)
    return None


# --------------------------------------------------------------------------- #
# 解析
# --------------------------------------------------------------------------- #
def extract_toc_links(index_html: str, base_url: str) -> list[str]:
    """从 gitbook 目录里按阅读顺序抽出章节链接，去重。"""
    # gitbook 目录每项为 <li class="chapter" data-path="xxx.html">，最可靠；
    # 注意 summary 列表是嵌套的，不能用非贪婪正则圈定区块（会被内层 </ul> 截断）。
    hrefs = re.findall(r'<li[^>]*class="[^"]*chapter[^"]*"[^>]*data-path="([^"#]+)"',
                       index_html, re.I)
    if not hrefs:
        # 兜底：bookdown/其它主题，直接扫全页的 .html 链接
        hrefs = re.findall(r'<a\s+[^>]*href="([^"#]+\.html)"', index_html, re.I)

    ordered, seen = [], set()
    base_host = urlparse(base_url).netloc
    for h in hrefs:
        absu = urljoin(base_url, h)
        # 只要同站、http(s) 的页面
        p = urlparse(absu)
        if p.scheme not in ("http", "https") or p.netloc != base_host:
            continue
        if absu not in seen:
            seen.add(absu)
            ordered.append(absu)
    return ordered


def extract_content(page_html: str) -> str | None:
    """抽出 gitbook 页面的正文区块。"""
    for pat in (
        r'<section\s+class="normal"[^>]*>(.*?)</section>',
        r'<div[^>]*role="main"[^>]*>(.*?)</div>\s*</div>\s*</div>',
        r'<main[^>]*>(.*?)</main>',
        r'<article[^>]*>(.*?)</article>',
    ):
        m = re.search(pat, page_html, re.S | re.I)
        if m and m.group(1).strip():
            return m.group(1)
    return None


def page_title(page_html: str) -> str:
    m = re.search(r"<title>(.*?)</title>", page_html, re.S | re.I)
    return html_mod.unescape(m.group(1).strip()) if m else ""


def meta_from_index(index_html: str) -> tuple[str, str]:
    """从首页猜测书名/作者。"""
    title = ""
    m = re.search(r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"', index_html, re.I)
    if m:
        title = html_mod.unescape(m.group(1).strip())
    if not title:
        t = page_title(index_html)
        title = re.split(r"\s*[|｜]\s*", t)[-1] if t else "Untitled"
    author = ""
    m = re.search(r'<meta[^>]+name="author"[^>]+content="([^"]+)"', index_html, re.I)
    if m:
        author = html_mod.unescape(m.group(1).strip())
    return title, author


# --------------------------------------------------------------------------- #
# 图片
# --------------------------------------------------------------------------- #
def localize_images(body: str, page_url: str, img_dir: str,
                    url_to_local: dict[str, str], download: bool) -> str:
    """把 <img> 的 src 改成绝对 URL；若 download=True 则下到本地并用占位符回填。
    只作用于 <img> 标签，避免误改 <script>/<iframe>/<source> 的 src。
    注意：懒加载图常用 data-src/srcset，本函数不处理（见 README 已知限制）。"""
    def fix_tag(m: re.Match) -> str:
        tag = m.group(0)
        sm = re.search(r'\ssrc="([^"]+)"', tag)
        if not sm:
            return tag
        raw = sm.group(1)
        if raw.startswith("data:"):
            return tag
        absu = urljoin(page_url, raw)
        new = absu if not download else f"@@IMG:{absu}@@"
        if download:
            url_to_local.setdefault(absu, "")  # 占位，稍后批量下载后回填
        return tag[:sm.start(1)] + new + tag[sm.end(1):]

    return re.sub(r'<img\b[^>]*>', fix_tag, body, flags=re.I)


def download_images(urls: list[str], img_dir: str, workers: int) -> dict[str, str]:
    """并发下载图片，返回 url -> 本地绝对路径（失败的不在 dict 里）。"""
    os.makedirs(img_dir, exist_ok=True)
    result: dict[str, str] = {}

    def one(u: str) -> tuple[str, str | None]:
        ext_m = IMG_EXT_RE.search(u)
        ext = ext_m.group(1).lower() if ext_m else "img"
        name = hashlib.sha1(u.encode()).hexdigest()[:16] + "." + ext
        path = os.path.join(img_dir, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return u, path
        data = fetch(u, binary=True, retries=2)
        if data is None or len(data) == 0:
            return u, None
        with open(path, "wb") as f:
            f.write(data)
        return u, path

    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for u, path in ex.map(one, urls):
            if path:
                result[u] = path
    return result


# --------------------------------------------------------------------------- #
# 主流程
# --------------------------------------------------------------------------- #
def build(args) -> int:
    if not shutil.which("pandoc"):
        print("错误：找不到 pandoc，请先安装（brew install pandoc）。", file=sys.stderr)
        return 2

    base = args.url
    if not urlparse(base).scheme:
        print("错误：URL 需要带 http(s)://", file=sys.stderr)
        return 2
    # 规范化：若末段不像文件名（无扩展名）且无结尾斜杠，补上斜杠，
    # 否则 urljoin 会把相对链接解析到上一级（…/fpp3 + a.html → …/a.html）。
    if "." not in urlparse(base).path.rsplit("/", 1)[-1] and not base.endswith("/"):
        base += "/"

    cache = args.cache or os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        ".cache_" + hashlib.sha1(base.encode()).hexdigest()[:8],
    )
    if args.clean and os.path.isdir(cache):
        shutil.rmtree(cache, ignore_errors=True)
    pages_dir = os.path.join(cache, "pages")
    img_dir = os.path.join(cache, "images")
    os.makedirs(pages_dir, exist_ok=True)

    # 渲染后端：仅在 render != off 时解析
    backend, chrome = (None, None)
    if args.render != "off":
        backend, chrome = ensure_render_backend(args.auto_install)
        if backend is None:
            print("错误：--render 需要 Playwright 或系统 Chromium，但都不可用。\n"
                  "  手动安装：pip install playwright && playwright install chromium",
                  file=sys.stderr)
            return 2
        print(f"· 渲染后端：{backend}" + (f" ({chrome})" if chrome else ""))

    def smart_fetch(u: str, *, need_toc: bool = False) -> str | None:
        """按 render 模式抓取一个页面。
        always: 直接渲染；auto: 先普通抓，正文/目录缺失再渲染；off: 仅普通抓。"""
        if args.render == "always":
            return render_fetch(u, backend, chrome, wait_ms=args.render_wait)
        h = fetch(u, retries=args.retries)
        if args.render == "auto":
            ok = bool(extract_toc_links(h or "", u)) if need_toc else bool(extract_content(h or ""))
            if not ok:
                rendered = render_fetch(u, backend, chrome, wait_ms=args.render_wait)
                if rendered:
                    return rendered
        return h

    print(f"· 抓取目录页 {base}")
    index_html = smart_fetch(base, need_toc=True)
    if index_html is None:
        print("错误：无法获取目录页。", file=sys.stderr)
        return 1

    links = extract_toc_links(index_html, base)
    # 若首页本身是正文（bookdown 常见），把它也放进来排首位
    if base not in links and extract_content(index_html):
        links.insert(0, base)
    if not links:
        print("错误：在目录页没找到任何章节链接。", file=sys.stderr)
        return 1
    if args.limit:
        links = links[: args.limit]
    print(f"· 共 {len(links)} 个章节页面")

    # 1) 下载所有页面（带缓存）
    def get_page(u: str) -> tuple[str, str | None]:
        cpath = os.path.join(pages_dir, hashlib.sha1(u.encode()).hexdigest()[:16] + ".html")
        if os.path.exists(cpath) and not args.refresh:
            return u, open(cpath, encoding="utf-8").read()
        h = smart_fetch(u)
        if h is not None:
            open(cpath, "w", encoding="utf-8").write(h)
        return u, h

    # 渲染走独立浏览器进程，并发太高会吃光内存；渲染模式下收紧并发
    page_workers = args.workers
    if args.render != "off":
        page_workers = min(args.workers, args.render_workers)

    pages: dict[str, str] = {}
    with cf.ThreadPoolExecutor(max_workers=page_workers) as ex:
        for u, h in ex.map(get_page, links):
            if h is not None:
                pages[u] = h
    failed_pages = [u for u in links if u not in pages]
    print(f"· 下载成功 {len(pages)}/{len(links)} 页"
          + (f"，失败 {len(failed_pages)}" if failed_pages else ""))

    # 2) 抽正文 + 处理图片
    url_to_local: dict[str, str] = {}
    parts, no_content = [], []
    for u in links:
        if u not in pages:
            continue
        body = extract_content(pages[u])
        if not body:
            no_content.append(u)
            continue
        body = re.sub(r'<a [^>]*class="anchor-section[^>]*>.*?</a>', "", body, flags=re.S)
        body = localize_images(body, u, img_dir, url_to_local, download=not args.no_images)
        parts.append(body)
    if no_content:
        print(f"· 警告：{len(no_content)} 页未识别出正文，已跳过", file=sys.stderr)
    if not parts:
        print("错误：没有可用正文。", file=sys.stderr)
        return 1

    # 3) 下载图片并回填本地路径
    if not args.no_images and url_to_local:
        wanted = list(url_to_local.keys())
        print(f"· 下载 {len(wanted)} 张图片 …")
        got = download_images(wanted, img_dir, args.workers)
        missing = len(wanted) - len(got)
        if missing:
            print(f"· 警告：{missing} 张图片下载失败，将从书中移除", file=sys.stderr)
        merged = "\n<hr/>\n".join(parts)

        def sub_img(m: re.Match) -> str:
            u = m.group(1)
            return got.get(u, "")  # 失败的图占位清空

        merged = re.sub(r'@@IMG:(.*?)@@', sub_img, merged)
        # 清掉 src 为空的 <img>
        merged = re.sub(r'<img\b[^>]*\bsrc=""[^>]*>', "", merged)
    else:
        merged = "\n<hr/>\n".join(parts)

    meta_title, meta_author = meta_from_index(index_html)
    title = args.title or meta_title
    author = args.author or meta_author or "Unknown"

    doc = (f'<!DOCTYPE html><html lang="{args.lang}"><head><meta charset="utf-8">'
           f"<title>{html_mod.escape(title)}</title></head><body>\n{merged}\n</body></html>")
    merged_path = os.path.join(cache, "merged.html")
    open(merged_path, "w", encoding="utf-8").write(doc)

    # 4) pandoc 打包
    out = os.path.abspath(args.output or (re.sub(r"\W+", "_", title).strip("_") + ".epub"))
    cmd = [
        "pandoc", merged_path, "-f", "html", "-t", "epub",
        "--toc", f"--toc-depth={args.toc_depth}", "--mathml",
        "--metadata", f"title={title}",
        "--metadata", f"author={author}",
        "--metadata", f"lang={args.lang}",
        "-o", out,
    ]
    if args.cover and os.path.exists(args.cover):
        cmd += ["--epub-cover-image", args.cover]
    print("· 运行 pandoc 打包 …")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        print("错误：pandoc 打包失败。", file=sys.stderr)
        return 1

    size = os.path.getsize(out) / 1024 / 1024
    print(f"\n✓ 完成：{out}  ({size:.1f} MB)")
    print(f"  章节 {len(parts)} 个"
          + (f"，图片 {len(got)} 张" if not args.no_images and url_to_local else "")
          + (f"，缓存目录 {cache}" if args.keep_cache else ""))
    if failed_pages:
        print(f"  注意：有 {len(failed_pages)} 页下载失败（重跑可补齐，缓存已保留）")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(
        description="把在线 gitbook/bookdown 电子书打包成 EPUB",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("url", nargs="?",
                   help="书籍首页/目录页 URL，例如 https://otexts.com/fppcn/index.html")
    p.add_argument("-o", "--output", help="输出 epub 文件路径（默认按书名生成）")
    p.add_argument("--title", help="书名（默认从首页识别）")
    p.add_argument("--author", help="作者（默认从首页识别）")
    p.add_argument("--lang", default="zh", help="语言代码")
    p.add_argument("--cover", help="封面图片路径")
    p.add_argument("--workers", type=int, default=12, help="并发下载数")
    p.add_argument("--retries", type=int, default=3, help="单个请求重试次数")
    p.add_argument("--toc-depth", type=int, default=2, help="目录层级深度")
    p.add_argument("--render", choices=["off", "auto", "always"], default="off",
                   help="抓 SPA：off 仅静态；auto 静态失败再用浏览器；always 全程浏览器")
    p.add_argument("--render-wait", type=int, default=6000,
                   help="渲染时额外等待毫秒数（让异步内容/懒加载就位）")
    p.add_argument("--render-workers", type=int, default=4,
                   help="渲染模式下的最大并发浏览器进程数")
    p.add_argument("--no-auto-install", dest="auto_install", action="store_false",
                   help="缺 Playwright 时不自动安装（默认会自动 pip 安装并下载浏览器）")
    p.add_argument("--setup", action="store_true",
                   help="只安装/校验 Playwright + Chromium 然后退出（首次部署用）")
    p.add_argument("--no-images", action="store_true", help="不下载图片（纯文字，更快更小）")
    p.add_argument("--limit", type=int, help="只处理前 N 章（调试用）")
    p.add_argument("--cache", help="缓存目录（默认在脚本旁按 URL 生成）")
    p.add_argument("--refresh", action="store_true", help="忽略页面缓存，重新下载 HTML")
    p.add_argument("--keep-cache", action="store_true", help="结束时打印缓存目录位置")
    p.add_argument("--clean", action="store_true", help="开始前清空该书缓存")
    args = p.parse_args()

    if args.setup:
        ok = ensure_playwright(True)
        print("✓ Playwright + Chromium 就绪" if ok
              else "✗ 安装未完成，请看上面的提示", file=sys.stderr)
        return 0 if ok else 1

    if not args.url:
        p.error("缺少 URL（或用 --setup 只做安装）")

    try:
        return build(args)
    except KeyboardInterrupt:
        print("\n已中断（缓存已保留，可重跑续传）。", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
