import { test, expect, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/posts/42'
      ? { id: 42, title: 'Scroll motion', tags: [], created_at: '2026-01-01', content: Array.from({ length: 8 }, (_, i) => `## Section ${i}\n\n${'Reading text. '.repeat(80)}`).join('\n\n') }
      : path.endsWith('/adjacent') ? {} : []
    return route.fulfill({ json: { code: 200, message: 'ok', data } })
  })
  await page.goto('/article/42')
  await expect(page.locator('.markdown-body h2')).toHaveCount(8, { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
})

async function sample(page: Page, top: number, duration = 600) {
  return page.evaluate(async ({ top, duration }) => {
    const bar = document.querySelector<HTMLElement>('[data-dock-bar]')!
    const back = document.querySelector<HTMLElement>('.article-back-dock')!
    const frames: { scale: number; opacity: number; backScale: number }[] = []
    window.scrollTo({ top, behavior: 'instant' })
    const start = performance.now()
    while (performance.now() - start < duration) {
      await new Promise(requestAnimationFrame)
      const style = getComputedStyle(bar)
      frames.push({ scale: new DOMMatrix(style.transform).a, opacity: Number(style.opacity), backScale: new DOMMatrix(getComputedStyle(back).transform).a })
    }
    return frames
  }, { top, duration })
}

test('scrolling collapses and expands the bar through visible intermediate sizes', async ({ page }) => {
  const bar = page.locator('[data-dock-bar]')
  const down = await sample(page, 500)
  expect(down.some(frame => frame.scale < 0.9 && frame.scale > 0.2 && frame.opacity > 0.1)).toBe(true)
  expect(down.some(frame => frame.backScale < 0.95 && frame.backScale > 0.6)).toBe(true)
  await expect(bar).toHaveCSS('visibility', 'hidden')
  await expect(bar).toHaveCSS('pointer-events', 'none')
  const up = await sample(page, 400)
  expect(up.some(frame => frame.scale > 0.2 && frame.scale < 0.95 && frame.opacity > 0.1)).toBe(true)
  await expect(bar).toHaveCSS('visibility', 'visible')
  expect(up.at(-1)!.scale).toBeCloseTo(1, 2)
  await page.getByRole('button', { name: 'Books', exact: true }).tap()
  await expect(page).toHaveURL(/\/books$/)
})

test('reversing direction midway returns smoothly and bottom-of-page controls remain visible', async ({ page }) => {
  const down = await sample(page, 500, 130)
  const up = await sample(page, 400)
  expect(Math.abs(up[0].scale - down.at(-1)!.scale)).toBeLessThan(0.15)
  expect(up.at(-1)!.scale).toBeCloseTo(1, 2)
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect(page.locator('html')).not.toHaveAttribute('data-reading-scroll', 'down')
  await expect(page.locator('[data-dock-bar]')).toHaveCSS('visibility', 'visible')
})

test('reduced motion keeps the controls immediate without a scaling animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const frames = await sample(page, 500, 120)
  expect(frames.every(frame => frame.scale === 1 && frame.backScale === 1)).toBe(true)
  await expect(page.locator('[data-dock-bar]')).toHaveCSS('visibility', 'hidden')
  await sample(page, 400, 120)
  await expect(page.locator('[data-dock-bar]')).toHaveCSS('visibility', 'visible')
})
