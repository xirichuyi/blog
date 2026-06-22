import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ExternalLink, Github, ArrowRight } from 'lucide-react'

interface Project {
  name: string
  description: string
  /** 站内页面（在线工具等），优先级最高 */
  internal?: string
  /** 主链接（外部在线地址 / 演示） */
  url?: string
  /** 源码仓库 */
  repo?: string
  tags?: string[]
}

// ↓↓↓ 在这里增删你的项目 / 小工具。改完保存即可。 ↓↓↓
const PROJECTS: Project[] = [
  {
    name: 'GitBook → EPUB',
    description: '输入在线书（GitBook / bookdown 等）的链接，一键导出干净的 EPUB 离线阅读。',
    internal: '/tools/gitbook2epub',
    tags: ['Tool', 'Online'],
  },
  {
    name: 'Proxy 节点',
    description: '自用代理节点，打开后填写口令 YJM2026 即可使用。',
    url: 'https://zhoumaosen.top/proxy',
    tags: ['Proxy', 'VPN'],
  },
]

export default function Projects() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
      <Helmet>
        <title>Projects · chuyi's blog</title>
      </Helmet>

      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="mt-2 text-muted-foreground">我做的一些小工具与实验。</p>
      </header>

      {PROJECTS.length === 0 ? (
        <p className="text-muted-foreground">还没有项目。</p>
      ) : (
        <div className="hover-list flex flex-col">
          {PROJECTS.map((p) => {
            const href = p.internal || p.url || p.repo
            const isInternal = Boolean(p.internal)
            const Wrapper: React.ElementType = !href ? 'div' : isInternal ? Link : 'a'
            const wrapperProps = !href
              ? {}
              : isInternal
                ? { to: p.internal! }
                : { href, target: '_blank', rel: 'noopener noreferrer' }
            return (
              <Wrapper
                key={p.name}
                {...wrapperProps}
                className="group block rounded-xl px-3 py-3 transition-colors hover:bg-accent"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-medium text-foreground transition-colors group-hover:text-primary">
                    {p.name}
                  </span>
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
                {p.url && p.repo && (
                  <a
                    href={p.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Github className="size-3.5" /> Source
                  </a>
                )}
              </Wrapper>
            )
          })}
        </div>
      )}
    </div>
  )
}
