import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ExternalLink, ArrowRight } from 'lucide-react'
import { COMMON_LINKS, faviconUrl } from '@/lib/common-links'

interface Tool {
  name: string
  description: string
  internal?: string
  url?: string
  tags?: string[]
}

// Public tools and services maintained for this site.
const TOOLS: Tool[] = [
  {
    name: 'GitBook 转 EPUB',
    description: '输入 GitBook 或 bookdown 地址，生成适合离线阅读的 EPUB 电子书。',
    internal: '/tools/gitbook2epub',
    tags: ['工具', '在线'],
  },
  {
    name: '邮件阅读器 · IMAP',
    description: '读取常见 IMAP 邮箱的最近邮件，凭据只在本次使用中有效，不会保存。',
    internal: '/tools/mailbox',
    tags: ['工具', '在线'],
  },
  {
    name: '量化收益 · Barter',
    description: '查看自托管 BTC 做市程序的只读收益曲线和表现快照。',
    internal: '/tools/quant',
    tags: ['量化', '实时'],
  },
  {
    name: '账单分析',
    description: '将微信账单整理成清晰的财务报告，数据全部留在浏览器中处理。',
    url: 'https://bill.chuyi.uk/',
    tags: ['工具', '在线'],
  },
  {
    name: '代理节点',
    description: '面向授权设备的代理节点与连接状态页面。',
    url: 'https://zhoumaosen.top/proxy',
    tags: ['代理'],
  },
  {
    name: '服务器监控',
    description: '实时查看 CPU、内存、磁盘、网络和运行时长。',
    url: 'https://monitor.chuyi.uk/',
    tags: ['监控'],
  },
  {
    name: 'USDTPay · 支付网关',
    description: '非托管多链 USDT 支付网关，支持钱包直结算、签名回调和 REST API。',
    url: 'https://pay.chuyi.uk/',
    tags: ['工具', '在线'],
  },
  {
    name: 'Sub2API · AI 网关',
    description: '统一路由和管理多个 AI 服务商的请求。',
    url: 'https://sub2api.chuyi.uk',
    tags: ['工具', 'AI'],
  },
  {
    name: '商城',
    description: '浏览和购买站点提供的商品与服务。',
    url: 'https://shop.chuyi.uk/',
    tags: ['服务', '在线'],
  },
  {
    name: 'Chrome',
    description: '通过网页访问自建的 Chrome 浏览器环境。',
    url: 'https://chrome-1.chuyi.uk/vnc.html?autoconnect=1&resize=scale',
    tags: ['工具', '在线'],
  },
]

function WebsiteLogo({ name, href, lazy }: { name: string; href: string; lazy: boolean }) {
  const [failed, setFailed] = useState(false)
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/70 bg-background text-xs font-semibold text-muted-foreground">
      {failed ? initials : <img src={faviconUrl(href)} alt="" loading={lazy ? 'lazy' : 'eager'} className="size-6" onError={() => setFailed(true)} />}
    </span>
  )
}

export default function Projects() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <Helmet>
        <title>Projects · chuyi's blog</title>
      </Helmet>

      <header className="public-page-head">
        <p className="literary-kicker">PROJECTS · 造物</p>
        <h1>做过的一些小东西</h1>
        <p>代码、工具与长期运行的服务。它们来自真实需要，也记录着不同阶段的兴趣。</p>
      </header>

      {/* Self-built projects */}
      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">自建项目</h2>
        <div className="hover-list flex flex-col">
          {TOOLS.map((p) => {
            const href = p.internal || p.url
            const isInternal = Boolean(p.internal)
            const Wrapper: React.ElementType = !href ? 'div' : isInternal ? Link : 'a'
            const wp = !href ? {} : isInternal ? { to: p.internal! } : { href, target: '_blank', rel: 'noopener noreferrer' }
            return (
              <Wrapper key={p.name} {...wp} className="group block rounded-xl px-3 py-3 transition-colors hover:bg-accent">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-medium text-foreground transition-colors group-hover:text-primary">{p.name}</span>
                  {p.tags?.map((t) => (
                    <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground">
                      {t}
                    </span>
                  ))}
                  {href &&
                    (isInternal ? (
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    ) : (
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    ))}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </Wrapper>
            )
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">常用网址</h2>
        <div className="hover-list grid gap-x-3 gap-y-1 sm:grid-cols-2" aria-label="常用网址列表">
          {COMMON_LINKS.map((link, index) => {
            const Icon = link.icon
            return (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent">
                <WebsiteLogo name={link.name} href={link.href} lazy={index > 5} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <strong className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{link.name}</strong>
                    <Icon className="size-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{link.description}</span>
                  <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground/70">{new URL(link.href, window.location.origin).hostname}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </a>
            )
          })}
        </div>
      </section>
    </div>
  )
}
