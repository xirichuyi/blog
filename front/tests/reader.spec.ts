import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import type { ReaderData } from '../src/lib/reader-state'

const empty = (): ReaderData => ({ revision: 0, progress: null, entries: [], review: '', rating: null })
const account = { email: 'reader@example.com', name: 'Reader' }
interface Server { data: ReaderData; offline?: boolean; guest?: boolean; writes: number }
async function mock(page: Page, server: Server, format = 'epub') {
  const book = { id: 1, title: 'Reader test', author: 'Test', notes: '', progress: 0, reading_status: 'reading', files: [{ id: 7, format, file_url: `/reader.${format}` }] }
  await page.route('**/api/**', route => route.fulfill({ json: { code: 200, message: 'ok', data: [] } }))
  await page.route('**/api/books', route => route.fulfill({ json: { code: 200, message: 'ok', data: [book] } }))
  await page.route('**/api/auth/session', route => route.fulfill({ status: server.guest ? 401 : 200, json: { code: server.guest ? 401 : 200, message: 'session', data: server.guest ? null : account } }))
  await page.route('**/api/books/1/files/7/reader', async route => {
    if (server.offline) return route.abort()
    if (route.request().method() === 'PUT') {
      const next = route.request().postDataJSON() as ReaderData
      if (next.revision !== server.data.revision) return route.fulfill({ status: 409, json: { code: 409, message: 'Conflict', data: null } })
      server.data = { ...next, revision: next.revision + 1 }
      server.writes++
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: server.data } })
  })
  await page.route(`**/reader.${format}`, route => route.fulfill({ path: path.resolve(`tests/fixtures/reader.${format}`), contentType: format === 'epub' ? 'application/epub+zip' : 'application/pdf' }))
}
async function open(page: Page) {
  await page.goto('/books/1/read?file=7')
  await expect(page.locator('.reader-state')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '书签、笔记与书评', exact: true })).toBeVisible()
  await expect(page.locator('.reader-state')).toHaveCount(0)
}
async function menu(page: Page) {
  const button = page.getByRole('button', { name: '阅读菜单', exact: true })
  if (await button.getAttribute('aria-expanded') !== 'true') await button.tap()
  await expect(page.getByRole('button', { name: 'Open table of contents', exact: true })).toBeVisible()
}
async function notes(page: Page) {
  await page.getByRole('button', { name: '书签、笔记与书评', exact: true }).tap()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test('mobile menu, chapter controls, and EPUB bookmarks restore in a fresh browser context', async ({ page, browser }) => {
  const server: Server = { data: empty(), writes: 0 }
  await mock(page, server)
  await open(page)
  await menu(page)
  await page.getByRole('button', { name: '下一章', exact: true }).tap()
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('Chapter Two')
  await notes(page)
  await page.getByRole('button', { name: '添加当前位置书签' }).tap()
  await page.getByRole('textbox', { name: /^笔记 / }).fill('跨设备书签笔记')
  await page.getByRole('textbox', { name: '书评', exact: true }).fill('这是一条私人书评')
  await page.getByLabel('图书评分').selectOption('4')
  await expect.poll(() => server.data.review).toBe('这是一条私人书评')
  expect(server.data.entries[0].note).toBe('跨设备书签笔记')
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  try {
    const other = await context.newPage()
    await mock(other, server)
    await open(other)
    await expect(other.frameLocator('iframe').locator('h1')).toHaveText('Chapter Two')
    await notes(other)
    await expect(other.getByRole('textbox', { name: /^笔记 / })).toHaveValue('跨设备书签笔记')
    await expect(other.getByRole('textbox', { name: '书评', exact: true })).toHaveValue('这是一条私人书评')
    await other.getByRole('button', { name: '关闭笔记' }).tap()
    await menu(other)
    await other.getByRole('button', { name: '上一章', exact: true }).tap()
    await expect(other.frameLocator('iframe').locator('h1')).toHaveText('Chapter One')
    await notes(other)
    await other.getByRole('button', { name: /书签 .*跳转/ }).tap()
    await expect(other.frameLocator('iframe').locator('h1')).toHaveText('Chapter Two')
  } finally { await context.close() }
})

test('selected EPUB text becomes a persistent highlight and can be deleted', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0 }
  await mock(page, server)
  await open(page)
  await page.frameLocator('iframe').locator('#p0').evaluate(element => {
    const selection = element.ownerDocument.defaultView!.getSelection()!
    const range = element.ownerDocument.createRange()
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)
    element.ownerDocument.dispatchEvent(new Event('selectionchange'))
  })
  await page.getByRole('button', { name: '高亮选中文字', exact: true }).tap()
  await expect(page.locator('.reader-entry-list blockquote')).toContainText('paragraph 0')
  await expect.poll(() => server.data.entries.length).toBe(1)
  expect(server.data.entries[0].highlight).toBe(true)
  await page.reload()
  await expect(page.locator('.reader-state')).toHaveCount(0)
  await expect(page.locator('.reader-highlight')).toHaveCount(1)
  await notes(page)
  await page.getByRole('button', { name: '删除标记' }).tap()
  await expect.poll(() => server.data.entries.length).toBe(0)
  await expect(page.locator('.reader-highlight')).toHaveCount(0)
})

test('PDF cloud page, outline, page notes and local offline retry', async ({ page }) => {
  const server: Server = { data: { ...empty(), revision: 1, progress: { kind: 'pdf', page: 2, pages: 3 } }, writes: 0 }
  await mock(page, server, 'pdf')
  await open(page)
  await menu(page)
  await expect(page.getByLabel('Current page')).toHaveValue('2')
  await page.getByRole('button', { name: 'Open table of contents' }).tap()
  await page.getByRole('button', { name: 'Final chapter' }).tap()
  await expect(page.getByLabel('Current page')).toHaveValue('3')
  await expect.poll(() => server.data.progress?.kind === 'pdf' && server.data.progress.page).toBe(3)
  server.offline = true
  await notes(page)
  await page.getByRole('button', { name: '添加当前位置书签' }).tap()
  await page.getByRole('textbox', { name: /^笔记 / }).fill('离线页面笔记')
  await expect(page.getByRole('button', { name: '重试同步', exact: true })).toBeVisible()
  server.offline = false
  await page.getByRole('button', { name: '重试同步', exact: true }).tap()
  await expect.poll(() => server.data.entries[0]?.note).toBe('离线页面笔记')
  await page.reload()
  await menu(page)
  await expect(page.getByLabel('Current page')).toHaveValue('3')
  await notes(page)
  await expect(page.getByRole('textbox', { name: /^笔记 / })).toHaveValue('离线页面笔记')
})

test('stale tab cannot silently overwrite a newer cloud review', async ({ page }) => {
  const server: Server = { data: { ...empty(), revision: 1, progress: { kind: 'pdf', page: 1, pages: 3 } }, writes: 0 }
  await mock(page, server, 'pdf')
  await open(page)
  await notes(page)
  server.data = { ...server.data, revision: 8, review: '另一设备的新书评' }
  await page.getByRole('textbox', { name: '书评', exact: true }).fill('旧页面的修改')
  await expect(page.getByRole('button', { name: '使用云端版本，放弃本地修改' })).toBeVisible()
  expect(server.data.review).toBe('另一设备的新书评')
  await page.getByRole('button', { name: '使用云端版本，放弃本地修改' }).tap()
  await expect(page.getByRole('textbox', { name: '书评', exact: true })).toHaveValue('另一设备的新书评')
})

test('guest local progress survives reload and menu works in scroll mode', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0, guest: true }
  await mock(page, server)
  await page.addInitScript(() => localStorage.setItem('book-reader-flow', 'scrolled'))
  await open(page)
  await menu(page)
  await page.getByRole('button', { name: 'Open table of contents' }).tap()
  await page.getByRole('button', { name: 'Chapter Two', exact: true }).tap()
  await notes(page)
  await page.getByRole('button', { name: '添加当前位置书签' }).tap()
  await page.reload()
  await notes(page)
  await expect(page.locator('.reader-entry-list li')).toHaveCount(1)
  expect(server.writes).toBe(0)
  await page.getByRole('button', { name: '关闭笔记' }).tap()
  await menu(page)
  await page.getByRole('button', { name: 'Open table of contents' }).tap()
  await expect(page.getByRole('button', { name: 'Chapter One', exact: true })).toBeVisible()
})

test('touching the visible center of a long scrolled chapter opens controls', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0, guest: true }
  await mock(page, server)
  await page.addInitScript(() => localStorage.setItem('book-reader-flow', 'scrolled'))
  await open(page)
  await expect(page.locator('iframe').first()).toBeVisible()
  const size = page.viewportSize()!
  await page.touchscreen.tap(size.width / 2, size.height / 2)
  await expect(page.getByRole('button', { name: '阅读菜单', exact: true })).toHaveAttribute('aria-expanded', 'true')
})

test('EPUB chapter scripts, event handlers and nested frames cannot execute', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0, guest: true }
  await mock(page, server)
  await open(page)
  const frame = page.frameLocator('iframe')
  await expect(frame.locator('script, iframe, [onload], [onerror]')).toHaveCount(0)
  await expect(frame.locator('#p0')).toHaveCSS('font-style', 'italic')
  await expect.poll(() => frame.locator('#fixture-picture').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1)
  await expect(frame.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /script-src 'none'/)
  expect(await page.evaluate(() => (window as unknown as { __bookScriptRan?: boolean }).__bookScriptRan)).toBeUndefined()
  // Verify the policy independently of sanitization: even a dynamically inserted
  // inline script in the chapter must be blocked by the browser.
  await frame.locator('body').evaluate(body => {
    const script = body.ownerDocument.createElement('script')
    script.textContent = 'parent.__bookScriptRan = true'
    body.appendChild(script)
  })
  expect(await page.evaluate(() => (window as unknown as { __bookScriptRan?: boolean }).__bookScriptRan)).toBeUndefined()
})
