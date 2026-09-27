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


test('Dock keeps magnification and neighbour displacement without pointer-time layout reads', async ({ page }) => {
  await page.goto('/')
  const home = page.getByRole('button', { name: 'Home', exact: true })
  const buttons = page.locator('[data-dock-item]')
  await expect(buttons).toHaveCount(6)
  const initial = await buttons.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, width: rect.width }
  }))
  await home.hover()
  await expect.poll(() => home.evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(46)
  const expanded = await buttons.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, width: rect.width }
  }))
  expect(expanded[1].width).toBeGreaterThan(initial[1].width)
  expect(expanded[5].x).toBeGreaterThan(initial[5].x + 3)
  const reads = await home.evaluate(async element => {
    const original = Element.prototype.getBoundingClientRect
    let count = 0
    Element.prototype.getBoundingClientRect = function () { count++; return original.call(this) }
    try {
      for (let i = 0; i < 200; i++) element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 500 + i }))
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      return count
    } finally { Element.prototype.getBoundingClientRect = original }
  })
  expect(reads).toBe(0)
  await page.mouse.move(0, 0)
  await expect.poll(() => buttons.evaluateAll(elements => Math.max(...elements.map(element => Math.abs(element.getBoundingClientRect().width - 36))))).toBeLessThan(0.1)
  await page.setViewportSize({ width: 900, height: 700 })
  await page.getByRole('button', { name: 'Projects', exact: true }).hover()
  await expect.poll(() => page.getByRole('button', { name: 'Projects', exact: true }).evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(46)
  // A queued pointer sample must not reopen the Dock after leaving in the same frame.
  await home.evaluate(element => {
    const bar = element.parentElement!
    bar.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 450 }))
    bar.dispatchEvent(new MouseEvent('mouseleave'))
  })
  await expect.poll(() => buttons.evaluateAll(elements => Math.max(...elements.map(element => Math.abs(element.getBoundingClientRect().width - 36))))).toBeLessThan(0.1)
})

test('Dock center arithmetic matches real flex layout at different widths', async ({ page }) => {
  const { dockCenters } = await import('../src/lib/dock-layout')
  await page.goto('/')
  await expect(page.locator('[data-dock-item]')).toHaveCount(6)
  for (const viewport of [1280, 900, 375]) {
    await page.setViewportSize({ width: viewport, height: 800 })
    const samples = await page.locator('[data-dock-item]').first().evaluate(element => {
      const buttons = Array.from(element.parentElement!.querySelectorAll<HTMLElement>('[data-dock-item]'))
      const baseline = buttons.map(button => {
        const rect = button.getBoundingClientRect()
        return { center: rect.x + rect.width / 2, width: rect.width }
      })
      const original = buttons.map(button => button.style.width)
      try {
        return Array.from({ length: 40 }, (_, sample) => {
          const widths = buttons.map((_, index) => 36 + ((sample * 17 + index * 31) % 1400) / 100)
          buttons.forEach((button, index) => { button.style.width = `${widths[index]}px` })
          const actual = buttons.map(button => {
            const rect = button.getBoundingClientRect()
            return rect.x + rect.width / 2
          })
          return { baseline, widths, actual }
        })
      } finally { buttons.forEach((button, index) => { button.style.width = original[index] }) }
    })
    for (const sample of samples) {
      dockCenters(sample.baseline, sample.widths).forEach((center, index) => {
        expect(Math.abs(center - sample.actual[index])).toBeLessThan(0.1)
      })
    }
  }
})
