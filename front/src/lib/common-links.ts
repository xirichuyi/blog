import {
  Bot,
  FileText,
  ImageIcon,
  LineChart,
  Monitor,
  type LucideIcon,
} from 'lucide-react'

export interface CommonLink {
  name: string
  description: string
  href: string
  icon: LucideIcon
  category: '工作台' | '开发' | '服务' | '网络工具'
}

export function faviconUrl(href: string): string {
  const domain = new URL(href, window.location.origin).hostname
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
}

// One small, curated list for personal services that are useful to revisit.
// Keep public project descriptions in Projects; put only frequently used URLs here.
export const COMMON_LINKS: CommonLink[] = [
  { name: 'Cloudflare', description: '域名、DNS、Workers 与 R2 管理控制台。', href: 'https://dash.cloudflare.com/', icon: Monitor, category: '服务' },
  { name: 'Oracle Cloud 中国', description: 'Oracle Cloud 中国区账户登录入口。', href: 'https://www.oracle.com/cn/cloud/sign-in.html', icon: Monitor, category: '服务' },
  { name: 'Gemini', description: 'Google 的 AI 助手与多模态工具。', href: 'https://gemini.google.com/', icon: Bot, category: '工作台' },
  { name: 'Grok', description: 'xAI 的对话、搜索和创作助手。', href: 'https://grok.com/', icon: Bot, category: '工作台' },
  { name: 'ChatGPT', description: 'OpenAI 的通用 AI 助手。', href: 'https://chatgpt.com/', icon: Bot, category: '工作台' },
  { name: 'Claude', description: 'Anthropic 的写作、分析和编程助手。', href: 'https://claude.ai/', icon: Bot, category: '工作台' },
  { name: 'iLovePDF', description: '合并、拆分、压缩、转换和编辑 PDF 文件。', href: 'https://www.ilovepdf.com/', icon: FileText, category: '工作台' },
  { name: 'iLoveIMG', description: '压缩、调整大小、裁剪和转换图片。', href: 'https://www.iloveimg.com/', icon: ImageIcon, category: '工作台' },
  { name: 'CloudConvert', description: '在线转换 PDF、图片、视频和多种文件格式。', href: 'https://cloudconvert.com/', icon: FileText, category: '工作台' },
  { name: 'Speedtest', description: '测试当前网络的下载、上传和延迟。', href: 'https://www.speedtest.net/', icon: LineChart, category: '网络工具' },
  { name: 'IPPure', description: '查询 IP 归属、风险和纯净度信息。', href: 'https://ippure.com/', icon: LineChart, category: '网络工具' },
  { name: 'CleanIP', description: '交叉查询 IP 信誉、代理和数据中心属性。', href: 'https://cleanip.io/', icon: LineChart, category: '网络工具' },
  { name: 'BrowserLeaks', description: '检查 DNS、WebRTC 和浏览器隐私泄露。', href: 'https://browserleaks.com/', icon: Monitor, category: '网络工具' },
  { name: 'Z-Library', description: '电子书检索与阅读入口。', href: 'https://z-library.sk/', icon: FileText, category: '工作台' },
  { name: 'Yandex', description: 'Yandex 搜索、图片和其他互联网服务。', href: 'https://yandex.com/', icon: Monitor, category: '工作台' },
  { name: 'DeepL 翻译', description: '支持文本和文档的机器翻译服务。', href: 'https://www.deepl.com/translator', icon: FileText, category: '工作台' },
  { name: '互联网档案馆', description: '查找公开数字资料和历史网页存档。', href: 'https://archive.org/', icon: FileText, category: '工作台' },
  { name: 'TopHub', description: '发现热门产品、技术和互联网趋势。', href: 'https://tophub.today/', icon: LineChart, category: '工作台' },
  { name: 'Go 官方文档', description: 'Go 语言官方文档、教程和规范。', href: 'https://go.dev/doc/', icon: FileText, category: '开发' },
  { name: 'Rust 官方文档', description: 'Rust 语言官方文档与学习手册。', href: 'https://doc.rust-lang.org/book/', icon: FileText, category: '开发' },
  { name: 'Vue 官方文档', description: 'Vue.js 官方指南、教程和 API 文档。', href: 'https://vuejs.org/', icon: FileText, category: '开发' },
  { name: 'React 官方文档', description: 'React 官方学习教程和 API 参考。', href: 'https://react.dev/', icon: FileText, category: '开发' },
  { name: '墨刀', description: '在线原型设计、流程图和团队协作工具。', href: 'https://modao.cc/', icon: Monitor, category: '工作台' },
  { name: 'BOCE 网站测速', description: '测试网站 HTTP 访问速度、响应时间和可用性。', href: 'https://www.boce.com/http', icon: LineChart, category: '网络工具' },
  { name: 'DNS Checker', description: '从多个地区检查域名 DNS 记录是否解析生效。', href: 'https://dnschecker.org/', icon: Monitor, category: '网络工具' },
]
