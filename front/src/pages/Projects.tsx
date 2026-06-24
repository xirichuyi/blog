import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ExternalLink, Github, ArrowRight, Star, Loader2 } from 'lucide-react'
import { getGithubProjects, type GhRepo } from '@/services/github'
import MailReader from '@/components/MailReader'

interface Tool {
  name: string
  description: string
  internal?: string
  url?: string
  tags?: string[]
}

// 博客自建、能直接用的在线工具 / 链接。
const TOOLS: Tool[] = [
  {
    name: 'GitBook → EPUB',
    description: '输入在线书（GitBook / bookdown 等）的链接，一键导出干净的 EPUB 离线阅读。',
    internal: '/tools/gitbook2epub',
    tags: ['Tool', 'Online'],
  },
  {
    name: '见微 · 账单分析',
    description: '上传微信账单，一键生成看得懂的财务报告：健康评分、消费分类、月度走势、商户分析。数据全程在浏览器本地处理，不上传服务器。',
    url: 'https://bill.chuyi.uk/',
    tags: ['Tool', 'Online'],
  },
  {
    name: 'Proxy 节点',
    description: '自用代理节点，打开后填写口令 YJM2026 即可使用。',
    url: 'https://zhoumaosen.top/proxy',
    tags: ['Proxy'],
  },
  {
    name: '服务器监控 · Beszel',
    description: '服务器实时状态面板：CPU / 内存 / 磁盘 / 网络 / 在线时长。',
    url: 'https://monitor.chuyi.uk/',
    tags: ['Monitor'],
  },
]

// 语言对应的小圆点颜色（GitHub 风格）。
const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Go: '#00ADD8',
  Rust: '#dea584',
  Python: '#3572A5',
  Ruby: '#701516',
  'C#': '#178600',
  Java: '#b07219',
  Vue: '#41b883',
  Shell: '#89e051',
}

export default function Projects() {
  const [repos, setRepos] = useState<GhRepo[] | null>(null)
  const [ghError, setGhError] = useState(false)

  useEffect(() => {
    getGithubProjects()
      .then(setRepos)
      .catch(() => setGhError(true))
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <Helmet>
        <title>Projects · chuyi's blog</title>
      </Helmet>

      {/* 在线工具 */}
      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">在线工具</h2>
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

      {/* 邮箱阅读（IMAP）—— 凭据当场填写、用完即丢 */}
      <section className="mt-12">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">邮箱阅读 · IMAP</h2>
        <MailReader />
      </section>

      {/* 开源项目（GitHub 自动拉取） */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">开源项目</h2>
          <a
            href="https://github.com/xirichuyi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="size-3.5" /> @xirichuyi
          </a>
        </div>

        {!repos && !ghError && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> 加载中…
          </div>
        )}
        {ghError && <p className="py-6 text-sm text-muted-foreground">暂时无法从 GitHub 加载项目，稍后再试。</p>}

        {repos && (
          <div className="hover-list flex flex-col">
            {repos.map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl px-3 py-3 transition-colors hover:bg-accent"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-medium text-foreground transition-colors group-hover:text-primary">{r.name}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {r.language && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full" style={{ background: LANG_COLOR[r.language] ?? '#888' }} />
                      {r.language}
                    </span>
                  )}
                  {r.stars > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5" /> {r.stars}
                    </span>
                  )}
                </div>
              </a>
            ))}
            {repos.length === 0 && <p className="py-6 text-sm text-muted-foreground">还没有带描述的公开仓库。</p>}
          </div>
        )}
      </section>
    </div>
  )
}
