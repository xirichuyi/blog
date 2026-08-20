import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ExternalLink, Github, ArrowRight, Star, Loader2 } from 'lucide-react'
import { getGithubProjects, type GhRepo } from '@/services/github'

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
    name: 'GitBook → EPUB',
    description: 'Paste a GitBook or bookdown URL and export a clean EPUB for offline reading.',
    internal: '/tools/gitbook2epub',
    tags: ['Tool', 'Online'],
  },
  {
    name: 'Mail Reader · IMAP',
    description: 'Read recent messages from common IMAP providers. Credentials are used once and never stored.',
    internal: '/tools/mailbox',
    tags: ['Tool', 'Online'],
  },
  {
    name: 'Quant Performance · Barter',
    description: 'A read-only equity curve and return snapshot for a self-hosted BTC market-making bot.',
    internal: '/tools/quant',
    tags: ['Quant', 'Live'],
  },
  {
    name: 'Jianwei · Expense Analysis',
    description: 'Turn a WeChat statement into a clear financial report. All data stays in your browser.',
    url: 'https://bill.chuyi.uk/',
    tags: ['Tool', 'Online'],
  },
  {
    name: 'Proxy Node',
    description: 'A private proxy node and connection status page for authorized devices.',
    url: 'https://zhoumaosen.top/proxy',
    tags: ['Proxy'],
  },
  {
    name: 'Server Monitor · Beszel',
    description: 'Live CPU, memory, disk, network, and uptime monitoring.',
    url: 'https://monitor.chuyi.uk/',
    tags: ['Monitor'],
  },
  {
    name: 'USDTPay · Payment Gateway',
    description: 'A non-custodial multi-chain USDT gateway with direct wallet settlement, signed callbacks, and a REST API.',
    url: 'https://pay.chuyi.uk/',
    tags: ['Tool', 'Online'],
  },
  {
    name: 'Sub2API · AI Gateway',
    description: 'A unified gateway for routing and managing requests across multiple AI providers.',
    url: 'https://sub2api.chuyi.uk',
    tags: ['Tool', 'AI'],
  },
]

// GitHub-style language colors.
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

      {/* Online tools */}
      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">Online Tools</h2>
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

      {/* Open-source projects loaded from GitHub. */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Open Source</h2>
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
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        )}
        {ghError && <p className="py-6 text-sm text-muted-foreground">GitHub projects are temporarily unavailable. Please try again later.</p>}

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
            {repos.length === 0 && <p className="py-6 text-sm text-muted-foreground">No described public repositories yet.</p>}
          </div>
        )}
      </section>
    </div>
  )
}
