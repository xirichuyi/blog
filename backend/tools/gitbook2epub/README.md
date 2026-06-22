# gitbook2epub

把在线 **gitbook / bookdown** 电子书抓取并打包成单个 EPUB。

只依赖 **Python 3** 标准库 + **pandoc**（`brew install pandoc`）。

## 用法

```bash
# 整本书
./gitbook2epub.py https://otexts.com/fppcn/index.html -o fppcn.epub

# 自定义书名/作者/封面
./gitbook2epub.py <url> --title "预测：方法与实践" --author "Hyndman" --cover cover.jpg

# 纯文字（不下图，更快更小）
./gitbook2epub.py <url> --no-images

# 调试：只取前 5 章
./gitbook2epub.py <url> --limit 5

# 提高并发
./gitbook2epub.py <url> --workers 16
```

常用参数：`--lang`、`--toc-depth`、`--retries`、`--cache`、`--refresh`（忽略页面缓存重下）、`--clean`（先清缓存）。

## 抓 SPA（JavaScript 动态渲染的站点）

默认只抓静态 HTML。遇到正文靠 JS 渲染的站点，加 `--render`：

```bash
./gitbook2epub.py <url> --render auto      # 静态抓不到正文时，自动用浏览器兜底（推荐）
./gitbook2epub.py <url> --render always    # 每一页都用浏览器渲染
```

渲染后端**优先 Playwright**，没装时**自动 pip 安装并下载 Chromium**（首次较慢）；
若不想自动装用 `--no-auto-install`（会退回系统已装的 Chromium）。
相关参数：`--render-wait`（等待异步内容的毫秒数）、`--render-workers`（并发浏览器进程数，默认 4）。

## 部署到 Linux 服务器

```bash
# 1) 基础依赖
sudo apt install -y pandoc python3

# 2) 一次性安装渲染后端（要抓 SPA 才需要）
python3 gitbook2epub.py --setup            # = pip install playwright + 下载 chromium
sudo python3 -m playwright install-deps chromium   # 装 Chromium 的系统库（headless 服务器必需）

# 3) 正常使用
python3 gitbook2epub.py <url> --render auto -o book.epub
```

建议放进 venv：`python3 -m venv venv && . venv/bin/activate`，再跑 `--setup`。
无界面服务器上 Playwright 以 headless 运行，已自动加 `--no-sandbox`。

## 适用的网页

✅ 用 **bookdown / gitbook 模板**生成的静态电子书站点，典型特征：
- 侧边栏目录是 `<li class="chapter" data-path="...">`，每章一个 `.html`
- 正文在 `<section class="normal">`（或 `<main>`/`<article>`/`role="main"`）里
- 例：otexts.com 上的 FPP 系列（fppcn / fpp2 / fpp3）、大量 bookdown.org 上的书、R/统计类讲义

⚠️ 不一定适用 / 需要改造：
- 正文靠 JavaScript 动态渲染的 SPA → 用 `--render`（见下）
- 需要登录/付费才能看的内容
- 目录结构完全不同的自定义站点（可改 `extract_toc_links` / `extract_content` 两个函数适配）

### 已知限制
- **懒加载图片**：只处理 `<img src>`，不处理 `data-src` / `srcset`。渲染时不会自动滚动触发懒加载，这类图可能缺失。
- **数学公式**：已开 `--mathml`，但页面里以纯文本 LaTeX（`\( \)`）形式存在的公式 pandoc 不一定识别。
- **非 gitbook 站**：目录靠兜底的"全页 .html 链接"扫描，顺序/范围可能不准。

## 健壮性设计

- 下载失败自动**重试 + 指数退避**；单页/单图失败不会让整本书失败，结束时汇总报告
- 页面与图片**本地缓存**，重复运行秒级完成；中断后可重跑续传
- 图片先**下载到本地再嵌入**，失败的图自动从书中移除（不会留下坏链接）
- 章节严格按目录原始顺序排列

## 版权

仅用于把**可免费公开阅读**的开放教材转成离线格式自用。请遵守目标网站的许可与使用条款。
