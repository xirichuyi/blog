import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/posts'
      ? { items: [1, 2].map(id => ({ id, title: `Article ${id}`, tags: [], created_at: '2026-09-01' })), total: 2 }
      : path === '/api/about' ? { title: 'Performance fixture', content: 'A short introduction.' } : {}
    return route.fulfill({ json: { code: 200, message: 'ok', data } })
  })
})

test('moving inside the active row does not remeasure layout', async ({ page }) => {
  await page.goto('/')
  const row = page.locator('.hover-list-item').first()
  await row.hover()
  await expect(page.locator('.hover-list-indicator')).toHaveCSS('opacity', '1')
  const reads = await row.evaluate(element => {
    let count = 0
    const names = ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop'] as const
    const descriptors = names.map(name => Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)!)
    names.forEach((name, index) => Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get() { count++; return descriptors[index].get!.call(this) },
    }))
    try {
      const [title, meta] = element.querySelectorAll('span')
      for (let i = 0; i < 100; i++) {
        title.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: meta }))
        meta.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse', relatedTarget: title }))
      }
      return count
    } finally {
      names.forEach((name, index) => Object.defineProperty(HTMLElement.prototype, name, descriptors[index]))
    }
  })
  expect(reads).toBe(0)
  await page.locator('.hover-list-item').nth(1).hover()
  await expect.poll(() => page.locator('.hover-list-indicator').evaluate(indicator => {
    const row = document.querySelectorAll<HTMLElement>('.hover-list-item')[1]
    const bounds = indicator.getBoundingClientRect()
    const target = row.getBoundingClientRect()
    return Math.abs(bounds.y + bounds.height / 2 - target.y - target.height / 2)
  })).toBeLessThan(1)
})
