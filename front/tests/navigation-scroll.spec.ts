import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('new routes start at the top and back/forward restores positions after delayed data', async ({ page }) => {
  let requests = 0
  await page.route('**/api/books', async route => {
    if (++requests > 1) await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({ json: { code: 200, message: 'ok', data: Array.from({ length: 25 }, (_, index) => ({
      id: index + 1, title: `Book ${index}`, author: 'Author', files: [], reading_status: 'want_to_read', progress: 0,
    })) } })
  })
  await page.route('**/api/auth/session', route => route.fulfill({ status: 401, json: { code: 401, message: 'guest', data: null } }))
  await page.goto('/books')
  await expect(page.locator('.library-book')).toHaveCount(25)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo({ top: 1800, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => Math.abs(scrollY - 1800))).toBeLessThan(3)
  await page.getByRole('button', { name: 'Projects', exact: true }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => Math.abs(scrollY - 900))).toBeLessThan(3)
  await page.goBack()
  await expect(page.locator('.library-book')).toHaveCount(25)
  await expect.poll(() => page.evaluate(() => Math.abs(scrollY - 1800))).toBeLessThan(3)
  await page.goForward()
  await expect.poll(() => page.evaluate(() => Math.abs(scrollY - 900))).toBeLessThan(3)
  // A fresh navigation to the same shelf is a new history entry, not Back.
  await page.getByRole('button', { name: 'Books', exact: true }).click()
  await expect(page.locator('.library-book')).toHaveCount(25)
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
})
