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
async function open(page: Page, format = 'epub') {
  await page.goto('/books/1/read?file=7')
  await expect(page.locator(format === 'epub' ? 'iframe' : '.textLayer span').first()).toBeVisible()
  await expect(page.locator('.reader-state')).toHaveCount(0)
}
async function menu(page: Page) {
  const toc = page.getByRole('button', { name: 'Open table of contents', exact: true })
  if (!await toc.isVisible()) {
    const size = page.viewportSize()!
    await page.touchscreen.tap(size.width / 2, size.height / 2)
  }
  await expect(toc).toBeVisible()
}
async function selectText(page: Page, format = 'epub') {
  const target = format === 'epub' ? page.locator('iframe').last().contentFrame().locator('#p0') : page.locator('.textLayer span').first()
  await expect(target).toBeInViewport()
  await target.evaluate(element => {
    const selection = element.ownerDocument.defaultView!.getSelection()!
    const range = element.ownerDocument.createRange()
    range.setStart(element.firstChild!, 0)
    range.setEnd(element.lastChild!, element.lastChild!.textContent!.length)
    selection.removeAllRanges()
    selection.addRange(range)
    element.ownerDocument.dispatchEvent(new Event('selectionchange'))
  })
  await page.getByRole('button', { name: '写批注', exact: true }).tap()
}
async function saveNote(page: Page, note: string, format = 'epub') {
  await selectText(page, format)
  await page.getByRole('textbox', { name: '批注内容' }).fill(note)
  await page.getByRole('button', { name: '保存批注' }).tap()
}

test('single row mobile controls, chapter notes and cloud position restore in a fresh context', async ({ page, browser }) => {
  const server: Server = { data: empty(), writes: 0 }
  await mock(page, server)
  await open(page)
  await menu(page)
  await expect(page.getByRole('button', { name: '阅读菜单', exact: true })).toHaveCount(0)
  await expect(page.getByText('已同步云端', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '下一章', exact: true }).tap()
  await expect(page.locator('iframe').last().contentFrame().locator('h1')).toHaveText('Chapter Two')
  await saveNote(page, '跨设备段落批注')
  await expect(page.getByRole('button', { name: '查看批注', exact: true })).toBeVisible()
  await expect.poll(() => server.data.entries[0]?.note).toBe('跨设备段落批注')
  expect(server.data.review).toBe('')
  const context = await browser.newContext({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true })
  try {
    const other = await context.newPage()
    await mock(other, server)
    await open(other)
    await expect(other.frameLocator('iframe').locator('h1')).toHaveText('Chapter Two')
    await other.getByRole('button', { name: '查看批注', exact: true }).tap()
    await expect(other.getByRole('dialog', { name: '段落批注' })).toContainText('跨设备段落批注')
    await other.getByRole('button', { name: '关闭批注' }).tap()
    await menu(other)
    const boxes = await other.locator('.reader-toolbar button').evaluateAll(buttons => buttons.map(button => { const r = button.getBoundingClientRect(); return { y: r.y, right: r.right, left: r.left } }))
    expect(Math.max(...boxes.map(b => b.y)) - Math.min(...boxes.map(b => b.y))).toBeLessThan(2)
    expect(boxes.every(b => b.left >= 0 && b.right <= 320)).toBe(true)
    await other.getByRole('button', { name: '上一章', exact: true }).tap()
    await expect(other.frameLocator('iframe').locator('h1')).toHaveText('Chapter One')
    await expect(other.getByRole('button', { name: '查看批注', exact: true })).toHaveCount(0)
  } finally { await context.close() }
})

test('paragraph icon opens a note, supports edit and deletion', async ({ page }, testInfo) => {
  const server: Server = { data: empty(), writes: 0 }
  await mock(page, server)
  await open(page)
  await saveNote(page, '这一段值得再读。')
  await expect.poll(() => server.data.entries.length).toBe(1)
  await page.reload()
  await page.getByRole('button', { name: '查看批注', exact: true }).tap()
  await expect(page.getByRole('dialog')).toContainText('这一段值得再读。')
  await page.screenshot({ path: testInfo.outputPath('note.png') })
  await page.getByRole('button', { name: '编辑批注' }).tap()
  await page.getByRole('textbox', { name: '批注内容' }).fill('修改后的想法')
  await page.getByRole('button', { name: '保存批注' }).tap()
  await expect.poll(() => server.data.entries[0]?.note).toBe('修改后的想法')
  await page.getByRole('button', { name: '查看批注', exact: true }).tap()
  await page.getByRole('button', { name: '编辑批注' }).tap()
  await page.getByRole('button', { name: '删除批注' }).tap()
  await expect.poll(() => server.data.entries.length).toBe(0)
  await expect(page.getByRole('button', { name: '查看批注', exact: true })).toHaveCount(0)
  await menu(page)
  await page.screenshot({ path: testInfo.outputPath('toolbar.png') })
  await page.getByRole('button', { name: 'Reading preferences', exact: true }).tap()
  await page.getByRole('button', { name: '深色', exact: true }).tap()
  await page.screenshot({ path: testInfo.outputPath('preferences-night.png') })
})

test('PDF page, outline, text notes and offline retry', async ({ page }) => {
  const server: Server = { data: { ...empty(), revision: 1, progress: { kind: 'pdf', page: 2, pages: 3 } }, writes: 0 }
  await mock(page, server, 'pdf')
  await open(page, 'pdf')
  await menu(page)
  await expect(page.getByLabel('Current page')).toHaveValue('2')
  await page.getByRole('button', { name: 'Open table of contents' }).tap()
  await page.getByRole('button', { name: 'Final chapter' }).tap()
  await expect(page.getByLabel('Current page')).toHaveValue('3')
  await expect.poll(() => server.data.progress?.kind === 'pdf' && server.data.progress.page).toBe(3)
  server.offline = true
  await saveNote(page, '离线段落笔记', 'pdf')
  await page.getByRole('button', { name: '查看保存问题' }).tap()
  server.offline = false
  await page.getByRole('button', { name: '重试保存', exact: true }).tap()
  await expect.poll(() => server.data.entries[0]?.note).toBe('离线段落笔记')
  expect(server.data.entries[0].rects?.length).toBeGreaterThan(0)
  await page.reload()
  await page.getByRole('button', { name: '查看批注', exact: true }).tap()
  await expect(page.getByRole('dialog', { name: '段落批注' })).toContainText('离线段落笔记')
})

test('stale tab cannot silently overwrite newer cloud progress', async ({ page }) => {
  const server: Server = { data: { ...empty(), revision: 1, progress: { kind: 'pdf', page: 1, pages: 3 } }, writes: 0 }
  await mock(page, server, 'pdf')
  await open(page, 'pdf')
  await menu(page)
  server.data = { ...server.data, revision: 8, progress: { kind: 'pdf', page: 3, pages: 3 } }
  await page.getByRole('button', { name: 'Next page' }).tap()
  await page.getByRole('button', { name: '查看保存问题' }).tap()
  await page.getByRole('button', { name: '使用另一份记录' }).tap()
  await menu(page)
  await expect(page.getByLabel('Current page')).toHaveValue('3')
})

test('guest login returns to the edition and preserves paragraph notes', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0, guest: true }
  await mock(page, server)
  await open(page)
  await menu(page)
  await page.getByRole('button', { name: '下一章', exact: true }).tap()
  await expect(page.locator('iframe').last().contentFrame().locator('h1')).toHaveText('Chapter Two')
  await saveNote(page, '登录前的想法')
  await menu(page)
  await page.getByRole('button', { name: 'Reading preferences', exact: true }).tap()
  const login = page.getByRole('link', { name: '登录', exact: true })
  await expect(login).toHaveAttribute('href', /google.*return_to=%2Fbooks%2F1%2Fread%3Ffile%3D7/)
  await page.route('**/api/auth/google/start?*', async route => {
    server.guest = false
    await route.fulfill({ contentType: 'text/html', body: '<script>location.replace("/books/1/read?file=7")</script>' })
  })
  await login.tap()
  await expect(page).toHaveURL(/books\/1\/read\?file=7/)
  await expect.poll(() => server.data.entries[0]?.note).toBe('登录前的想法')
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('Chapter Two')
  await page.getByRole('button', { name: '查看批注', exact: true }).tap()
  await expect(page.getByRole('dialog')).toContainText('登录前的想法')
})

test('touching the visible center of a long scrolled chapter opens controls', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0, guest: true }
  await mock(page, server)
  await page.addInitScript(() => localStorage.setItem('book-reader-flow', 'scrolled'))
  await open(page)
  await menu(page)
  await page.getByRole('button', { name: 'Open table of contents' }).tap()
  await page.getByRole('button', { name: 'Chapter Two', exact: true }).tap()
  await expect(page.locator('iframe').last().contentFrame().locator('h1')).toHaveText('Chapter Two')
  await saveNote(page, '滚动模式批注')
  await page.reload()
  await page.getByRole('button', { name: '查看批注', exact: true }).tap()
  await expect(page.getByRole('dialog')).toContainText('滚动模式批注')
  expect(server.writes).toBe(0)
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

test('wide layout keeps notes beside the paragraph after resizing', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const server: Server = { data: empty(), writes: 0, guest: true }
  await mock(page, server)
  await open(page)
  await menu(page)
  await saveNote(page, '随排版保留的段落批注')
  await page.getByRole('button', { name: '查看批注', exact: true }).tap()
  await page.screenshot({ path: testInfo.outputPath('desktop-note.png') })
  await page.getByRole('button', { name: '关闭批注' }).tap()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '查看批注', exact: true }).tap()
  await expect(page.getByRole('dialog')).toContainText('随排版保留的段落批注')
})
