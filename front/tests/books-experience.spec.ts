import { test, expect, type Page } from '@playwright/test'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uoAAAAASUVORK5CYII=', 'base64')
const book = { id: 1, title: '慢慢读一本书', author: '作者', reading_status: 'reading', progress: 25,
  cover_url: 'http://127.0.0.1:4175/test-cover.png', files: [{ id: 7, format: 'epub', file_url: 'http://127.0.0.1:4175/test-book.epub' }] }
async function mock(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ json: { code: 200, message: 'ok', data: [book] } }))
  await page.route('**/api/auth/session', route => route.fulfill({ status: 401, json: { code: 401, message: 'Guest', data: null } }))
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

test('reader shows the cover while preparing chapters and offers retry on failure', async ({ page }) => {
  await mock(page)
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  let requests = 0
  await page.route('**/api/books/1/files/7/epub', async route => {
    requests++
    await pending
    await route.fulfill({ status: 503, json: { code: 503, message: '章节准备暂时不可用', data: null } })
  })
  await page.goto('/books/1/read?file=7')
  await expect(page.locator('.reader-state img')).toHaveClass(/opacity-100/, { timeout: 15000 })
  await expect(page.getByText('正在加载章节索引；首次打开需准备书籍…')).toBeVisible()
  release()
  await expect(page.getByRole('button', { name: '重试', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect.poll(() => requests).toBe(2)
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

const cachedReader = (progress: unknown, dirty = false) => JSON.stringify({ data: { revision: 1, progress, entries: [], review: '', rating: null }, dirty })

for (const mode of ['guest', 'cloud', 'unsynced', 'other-account', 'invalid'] as const) {
  test(`bookshelf resume feedback uses ${mode} progress without writing reader data`, async ({ page }) => {
    await mock(page)
    const email = 'reader@example.com'
    const position = { kind: 'epub', cfi: 'epubcfi(/6/2!/4/2:0)', percent: 37 }
    const key = `reader-v2:${mode === 'guest' || mode === 'invalid' ? 'guest' : encodeURIComponent(mode === 'other-account' ? 'someone@example.com' : email)}:1:7`
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key, value: cachedReader(mode === 'invalid' ? { ...position, percent: 200 } : position, mode === 'unsynced'),
    })
    let writes = 0
    if (mode === 'cloud' || mode === 'unsynced') {
      await page.route('**/api/auth/session', route => route.fulfill({ json: { code: 200, message: 'ok', data: { email, name: 'Reader' } } }))
    }
    await page.route('**/api/books/1/files/7/reader', route => {
      if (route.request().method() !== 'GET') writes++
      return route.fulfill({ json: { code: 200, message: 'ok', data: { revision: 2, progress: { ...position, percent: 62 } } } })
    })
    await page.goto('/books')
    const card = page.locator('a.library-book')
    if (mode === 'invalid' || mode === 'other-account') {
      await expect(card).toContainText('开始阅读 EPUB')
      await expect(card.locator('.library-book-progress')).toHaveCount(0)
    } else {
      await expect(card).toContainText('继续阅读 EPUB')
      await expect(card).toContainText(`上次读到 ${mode === 'cloud' ? 62 : 37}%`)
      await expect(card).toHaveAttribute('href', '/books/1/read?file=7')
    }
    expect(writes).toBe(0)
  })
}

test('bookshelf resumes the PDF edition that has a saved position', async ({ page }) => {
  await mock(page)
  await page.route('**/api/books', route => route.fulfill({ json: { code: 200, message: 'ok', data: [{ ...book, files: [...book.files, { id: 8, format: 'pdf', file_url: '/test.pdf' }] }] } }))
  await page.addInitScript(value => localStorage.setItem('reader-v2:guest:1:8', value), cachedReader({ kind: 'pdf', page: 12, pages: 100 }))
  await page.goto('/books')
  await expect(page.locator('a.library-book')).toContainText('继续阅读 PDF')
  await expect(page.locator('a.library-book')).toContainText('上次读到第 12 / 100 页')
  await expect(page.locator('a.library-book')).toHaveAttribute('href', '/books/1/read?file=8')
})
