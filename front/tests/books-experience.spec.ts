import { test, expect, type Page } from '@playwright/test'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uoAAAAASUVORK5CYII=', 'base64')
const book = { id: 1, title: '慢慢读一本书', author: '作者', reading_status: 'reading', progress: 25,
  cover_url: 'http://127.0.0.1:4175/test-cover.png', files: [{ id: 7, format: 'epub', file_url: 'http://127.0.0.1:4175/test-book.epub' }] }
async function mock(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ json: { code: 200, message: 'ok', data: [book] } }))
  await page.route('**/test-cover.png', route => route.fulfill({ contentType: 'image/png', body: png }))
}

test('bookshelf requests the independent cover without downloading the book', async ({ page }) => {
  await mock(page)
  let bookRequests = 0
  page.on('request', req => { if (req.url().endsWith('.epub')) bookRequests++ })
  await page.goto('/books')
  const cover = page.locator('.library-book-cover img')
  await expect(cover).toBeVisible({ timeout: 15000 })
  await expect(cover).toHaveClass(/opacity-100/)
  expect(bookRequests).toBe(0)
  const dimensions = await page.locator('.library-book-cover').boundingBox()
  expect(dimensions!.height).toBeGreaterThan(100)
  await page.screenshot({ path: '/tmp/blog-books-cover.png' })
})

test('failed cover keeps a readable fallback and book navigation', async ({ page }) => {
  await mock(page)
  await page.route('**/test-cover.png', route => route.fulfill({ status: 404 }))
  await page.goto('/books')
  await expect(page.locator('.library-book-cover strong')).toHaveText(book.title)
  await expect(page.locator('.library-book-cover img')).toHaveCount(0)
  await expect(page.locator('a.library-book')).toHaveAttribute('href', '/books/1/read?file=7')
})

test('reader shows the cover before download completes and offers retry on failure', async ({ page }) => {
  await mock(page)
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/test-book.epub', async route => { await pending; await route.fulfill({ status: 503 }) })
  await page.goto('/books/1/read?file=7')
  await expect(page.locator('.reader-state img')).toHaveClass(/opacity-100/, { timeout: 15000 })
  await expect(page.getByText('正在下载 EPUB…')).toBeVisible()
  release()
  await expect(page.getByRole('button', { name: '重试', exact: true })).toBeVisible()
})

test('bookshelf error can be retried without reloading the page', async ({ page }) => {
  await mock(page)
  let calls = 0
  await page.route('**/api/books', route => {
    calls++
    return route.fulfill({ status: calls === 1 ? 503 : 200, json: { code: calls === 1 ? 503 : 200, message: '暂时不可用', data: calls === 1 ? null : [book] } })
  })
  await page.goto('/books')
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.locator('a.library-book')).toBeVisible()
  expect(calls).toBe(2)
})
