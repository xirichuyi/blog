import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 800 } })
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/posts/42'
      ? { id: 42, title: 'Long article', created_at: '2026-01-01', tags: [], content: Array.from({ length: 40 }, (_, i) => `## Section ${i + 1}\n\n${'Reading text. '.repeat(80)}`).join('\n\n') }
      : path.endsWith('/adjacent') ? {} : []
    return route.fulfill({ json: { code: 200, message: 'ok', data } })
  })
  await page.goto('/article/42')
  await expect(page.locator('.article-toc-entry')).toHaveCount(40, { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
})

test('bottom TOC entries receive pointer events and leaving them does not recenter the list', async ({ page }) => {
  const toc = page.locator('.article-toc')
  await toc.evaluate(element => { element.scrollTop = element.scrollHeight })
  const last = page.locator('.article-toc-entry').last()
  const bounds = (await last.boundingBox())!
  const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.article-toc-entry')?.getAttribute('data-heading-id'), point)).toBe('section-40')
  const position = await toc.evaluate(element => element.scrollTop)
  await page.mouse.move(point.x, point.y)
  await expect(last).toHaveClass(/highlighted/)
  await page.mouse.move(700, 400)
  await expect(last).not.toHaveClass(/highlighted/)
  // Allow any accidental smooth-scroll triggered by hover exit to complete.
  await page.waitForTimeout(500)
  expect(await toc.evaluate(element => element.scrollTop)).toBe(position)
  await last.click()
  await expect(last).toHaveAttribute('aria-current', 'location')
})

test('back button gradually morphs with scroll and returns to the avatar', async ({ page }) => {
  const avatar = page.locator('.article-magnetic-back-avatar')
  const arrow = page.locator('.article-magnetic-back-arrow')
  await expect(avatar).toHaveCSS('opacity', '1')
  await page.evaluate(() => window.scrollTo({ top: 210, behavior: 'instant' }))
  await expect.poll(async () => Number(await avatar.evaluate(element => getComputedStyle(element).opacity))).toBeLessThan(0.5)
  expect(Number(await avatar.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(0)
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
  await expect(arrow).toHaveCSS('opacity', '1')
  await expect(avatar).toHaveCSS('opacity', '0')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(avatar).toHaveCSS('opacity', '1')
})

test('dock magnifies on hover, shrinks on exit and remains clickable', async ({ page }) => {
  const books = page.getByRole('button', { name: 'Books', exact: true })
  await books.hover()
  await expect.poll(async () => (await books.boundingBox())!.width).toBeGreaterThan(42)
  await page.mouse.move(700, 400)
  await expect.poll(async () => Math.abs((await books.boundingBox())!.width - 36)).toBeLessThan(0.1)
  const bounds = (await books.boundingBox())!
  await page.getByRole('button', { name: 'Enter focus mode', exact: true }).click()
  await expect(page.locator('.site-chrome')).toHaveCSS('opacity', '0')
  expect(await page.evaluate(({ x, y, width, height }) => Boolean(document.elementFromPoint(x + width / 2, y + height / 2)?.closest('.site-chrome')), bounds)).toBe(false)
  await page.getByRole('button', { name: 'Exit focus mode', exact: true }).click()
  await books.click()
  await expect(page).toHaveURL(/\/books$/)
})
