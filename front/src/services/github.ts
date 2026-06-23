// Pull the owner's public repos from GitHub and curate them for the Projects
// page. Self-curating: a repo shows up once it has a description (so throwaway
//练习仓 without descriptions stay hidden). Cached in localStorage to be gentle
// on GitHub's unauthenticated rate limit (60/hr per IP).
const USER = 'xirichuyi'
// 排除：本博客、违规脚本、GitHub 个人主页配置仓、占位仓。其余有描述的自动展示。
const EXCLUDE = new Set(['blog', 'change_the_score_script', 'xirichuyi', 'demo_1'])
const CACHE_KEY = 'gh_projects_v2'
const TTL = 30 * 60 * 1000 // 30 min

export interface GhRepo {
  name: string
  description: string
  language: string | null
  stars: number
  url: string
  pushedAt: string
  topics: string[]
}

interface RawRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  html_url: string
  pushed_at: string
  fork: boolean
  archived: boolean
  topics?: string[]
}

export async function getGithubProjects(): Promise<GhRepo[]> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as { t: number; d: GhRepo[] } | null
    if (cached && Date.now() - cached.t < TTL) return cached.d
  } catch {
    /* ignore cache errors */
  }

  const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const raw = (await res.json()) as RawRepo[]

  const repos: GhRepo[] = raw
    .filter((r) => !r.fork && !r.archived && !!r.description && !EXCLUDE.has(r.name))
    .map((r) => ({
      name: r.name,
      description: r.description as string,
      language: r.language,
      stars: r.stargazers_count,
      url: r.html_url,
      pushedAt: r.pushed_at,
      topics: r.topics ?? [],
    }))
    .sort((a, b) => b.stars - a.stars || (a.pushedAt < b.pushedAt ? 1 : -1))

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: repos }))
  } catch {
    /* ignore */
  }
  return repos
}
