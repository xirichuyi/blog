import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 480 } })
for (const count of [8, 40]) test(`automatic TOC tracking (${count} headings) keeps scroll geometry stable without pointer hover`, async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/posts/42' ? {
      id: 42, title: 'TOC scrolling', tags: [], created_at: '2026-01-01',
      content: Array.from({ length: count }, (_, i) => `## ${i % 2 ? 'Short' : 'A longer heading that wraps onto two lines in the narrow contents list'} ${i}\n\n${'Reading text. '.repeat(80)}`).join('\n\n'),
    } : path.endsWith('/adjacent') ? {} : []
    return route.fulfill({ json: { code: 200, message: 'ok', data } })
  })
  await page.goto('/article/42')
  await expect(page.locator('.article-toc-entry')).toHaveCount(count, { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(600, 300)
  const result = await page.evaluate(async count => {
    const toc = document.querySelector<HTMLElement>('.article-aside-inner')!
    const list = document.querySelector<HTMLElement>('.article-toc-list')!
    const headings = [...document.querySelectorAll<HTMLElement>('.markdown-body h2')]
    const unnecessaryScrolls: number[] = []
    const entries = [...toc.querySelectorAll<HTMLElement>('.article-toc-entry')]
    const samples: { height: number; width: number; scrollHeight: number; listHeight: number; top: number }[] = []
    for (const i of [count - 3, count - 2, count - 1, count - 2, count - 3, count - 1]) {
      const bounds = toc.getBoundingClientRect()
      const entry = entries[i].getBoundingClientRect()
      const visible = entry.top >= bounds.top + 4 && entry.bottom <= bounds.bottom - 4
      const before = toc.scrollTop
      window.scrollTo({ top: window.scrollY + headings[i].getBoundingClientRect().top - 100, behavior: 'instant' })
      const start = performance.now()
      while (performance.now() - start < 650) {
        await new Promise(requestAnimationFrame)
        samples.push({ height: toc.clientHeight, width: toc.clientWidth, scrollHeight: toc.scrollHeight, listHeight: list.offsetHeight, top: toc.scrollTop })
      }
      if (visible) unnecessaryScrolls.push(Math.abs(toc.scrollTop - before))
    }
    return { samples, unnecessaryScrolls, hovered: toc.matches(':hover'), navHeight: document.querySelector<HTMLElement>('.article-toc')!.clientHeight, listHeight: list.offsetHeight }
  }, count)
  expect(Math.max(0, ...result.unnecessaryScrolls)).toBeLessThanOrEqual(1)
  expect(result.hovered).toBe(false)
  expect(result.samples[0].scrollHeight).toBeGreaterThan(result.samples[0].height)
  expect(new Set(result.samples.map(s => s.scrollHeight)).size).toBe(1)
  expect(result.navHeight).toBeGreaterThanOrEqual(result.listHeight)
  expect(new Set(result.samples.map(s => s.width)).size).toBe(1)
  expect(new Set(result.samples.map(s => s.height)).size).toBe(1)
})
