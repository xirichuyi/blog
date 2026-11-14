import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import type { ReaderData } from '../src/lib/reader-state'

const empty = (): ReaderData => ({ revision: 0, progress: null, entries: [], review: '', rating: null })
const account = { email: 'reader@example.com', name: 'Reader' }
interface Server { data: ReaderData; offline?: boolean; guest?: boolean; writes: number }
const epubFixture = readFile(path.resolve('tests/fixtures/reader.epub')).then(bytes => JSZip.loadAsync(bytes))
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
  if (format === 'epub') {
    const archive = await epubFixture
    const sections = await Promise.all(['one', 'two'].map(async name => {
      const resource = `OEBPS/${name}.xhtml`
      return { path: resource, size: (await archive.file(resource)!.async('nodebuffer')).length, linear: true }
    }))
    await page.route('**/api/books/1/files/7/epub', route => route.fulfill({ json: { code: 200, message: 'ok', data: { version: 'fixture-v1', package: 'OEBPS/content.opf', sections, cacheable: true } } }))
    await page.route('**/api/books/1/files/7/epub/fixture-v1/**', async route => {
      const resource = decodeURIComponent(new URL(route.request().url()).pathname.split('/fixture-v1/')[1])
      const entry = archive.file(resource)
      if (!entry) return route.fulfill({ status: 404, body: 'Not found' })
      const contentType = resource.endsWith('.css') ? 'text/css' : resource.endsWith('.png') ? 'image/png' : 'application/xml'
      return route.fulfill({ body: await entry.async('nodebuffer'), contentType })
    })
  }
}
async function open(page: Page, format = 'epub') {
  await page.goto('/books/1/read?file=7')
  // EPUB.js can retain hidden views while rendering the active chapter.
  // Wait for a displayed page instead of assuming the first frame is active.
  try {
    await expect(page.locator(format === 'epub' ? 'iframe:visible' : '.textLayer span').first()).toBeVisible()
  } catch (error) {
    console.error('Reader readiness failed', await page.locator('iframe').evaluateAll(frames => frames.map(frame => ({
      width: frame.getBoundingClientRect().width,
      height: frame.getBoundingClientRect().height,
      visibility: getComputedStyle(frame).visibility,
      title: frame.contentDocument?.title,
    }))), await page.locator('.reader-state').allTextContents())
    throw error
  }
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

test('long EPUB reads only nearby chapters, restores progress immediately and reuses cached chapters', async ({ page }) => {
  const server: Server = { data: { ...empty(), revision: 1, progress: { kind: 'epub', cfi: 'epubcfi(/6/122!/4/2/1:0)', percent: 0 } }, writes: 0 }
  await mock(page, server)
  const requested: string[] = []
  const sections = Array.from({ length: 80 }, (_, index) => ({ path: `OEBPS/chapter-${index}.xhtml`, size: 10000, linear: true }))
  await page.route('**/api/books/1/files/7/epub', route => route.fulfill({ json: { code: 200, message: 'ok', data: { version: 'long-v1', package: 'OEBPS/content.opf', sections, cacheable: true } } }))
  const chapter = (index: number) => `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter ${index}</title></head><body><h1>Chapter ${index}</h1>${Array.from({ length: 50 }, (_, paragraph) => `<p id="p${paragraph}">Paragraph ${paragraph}. ${'Long reader fixture text. '.repeat(12)}</p>`).join('')}</body></html>`
  const packageXml = `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">long-reader</dc:identifier><dc:title>Long reader</dc:title><dc:language>en</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${sections.map((section, index) => `<item id="s${index}" href="chapter-${index}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${sections.map((_, index) => `<itemref idref="s${index}"/>`).join('')}</spine></package>`
  const navigation = `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol>${sections.map((_, index) => `<li><a href="chapter-${index}.xhtml">Chapter ${index}</a></li>`).join('')}</ol></nav></body></html>`
  await page.route('**/api/books/1/files/7/epub/long-v1/**', route => {
    const pathname = new URL(route.request().url()).pathname
    const match = pathname.match(/chapter-(\d+)\.xhtml$/)
    if (match) {
      requested.push(pathname)
      return route.fulfill({ body: chapter(Number(match[1])), contentType: 'application/xhtml+xml' })
    }
    if (pathname.endsWith('content.opf')) return route.fulfill({ body: packageXml, contentType: 'application/xml' })
    if (pathname.endsWith('nav.xhtml')) return route.fulfill({ body: navigation, contentType: 'application/xhtml+xml' })
    return route.fulfill({ status: 404 })
  })
  let archives = 0
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('.epub')) archives++ })
  await open(page)
  await expect(page.locator('iframe:visible').first().contentFrame().locator('h1')).toHaveText('Chapter 60')
  await expect(page.locator('.reader-progress > span')).toHaveText('75%')
  await expect.poll(() => server.data.progress?.kind === 'epub' ? server.data.progress.percent : 0).toBeGreaterThanOrEqual(75)
  await expect.poll(() => requested.length).toBe(4)
  expect(requested.every(url => /chapter-(59|60|61|62)\.xhtml$/.test(url))).toBe(true)
  await expect.poll(() => page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('reader-chapters-v1', 1)
    request.onsuccess = () => {
      const db = request.result
      const count = db.transaction('chapters').objectStore('chapters').count()
      count.onsuccess = () => { db.close(); resolve(count.result) }
      count.onerror = () => reject(count.error)
    }
    request.onerror = () => reject(request.error)
  }))).toBe(4)
  const beforeReload = requested.length
  await page.reload()
  await expect(page.locator('iframe:visible').first().contentFrame().locator('h1')).toHaveText('Chapter 60')
  await expect(page.locator('.reader-progress > span')).toHaveText('75%')
  expect(requested.length).toBe(beforeReload)
  expect(archives).toBe(0)
  await menu(page)
  await page.getByRole('button', { name: 'Open table of contents', exact: true }).tap()
  await page.getByRole('button', { name: 'Chapter 10', exact: true }).tap()
  await expect(page.locator('iframe:visible').last().contentFrame().locator('h1')).toHaveText('Chapter 10')
  await expect(page.locator('.reader-progress > span')).toHaveText('13%')
  expect(requested.some(url => url.endsWith('/chapter-10.xhtml'))).toBe(true)
  expect(requested.length).toBeLessThan(10)
})

test('reader follows system appearance and restores the blog document on exit', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await mock(page, { data: empty(), writes: 0 })
  await open(page)
  for (const selector of ['html', 'body', '.book-reader-page']) {
    await expect(page.locator(selector)).toHaveCSS('background-color', 'rgb(25, 28, 25)')
    await expect(page.locator(selector)).toHaveCSS('color-scheme', 'dark')
  }
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#191c19')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(251, 250, 246)')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#fbfaf6')
  await menu(page)
  await page.getByRole('button', { name: 'Reading preferences', exact: true }).tap()
  await page.getByRole('button', { name: '深色', exact: true }).tap()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(25, 28, 25)')
  await page.reload()
  await expect(page.locator('.book-reader-page')).toHaveCSS('background-color', 'rgb(25, 28, 25)')
  await expect(page.locator('iframe:visible').first()).toBeVisible()
  await expect(page.locator('.reader-state')).toHaveCount(0)
  await menu(page)
  await page.getByRole('button', { name: '返回书架', exact: true }).tap()
  await expect(page).toHaveURL(/\/books$/)
  await expect(page.locator('html')).not.toHaveAttribute('data-reader-theme')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#faf8f5')
  await expect(page.locator('body')).not.toHaveCSS('background-color', 'rgb(25, 28, 25)')
})

test('saved blog dark mode colors the document before the app loads and survives a reader round trip', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  await mock(page, { data: empty(), writes: 0 })
  // Hold the app entrypoint to exercise the installed app's launch background.
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/src/main.tsx', async route => { await pending; await route.continue() })
  try {
    await page.goto('/books', { waitUntil: 'commit' })
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(16, 20, 18)')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#101412')
    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveCount(0)
  } finally { release() }
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Light', exact: true }).tap()
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(250, 248, 245)')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#faf8f5')
  await page.getByRole('button', { name: 'Dark', exact: true }).tap()
  await page.locator('a.library-book').first().tap()
  await expect(page.locator('.reader-state')).toHaveCount(0)
  await expect(page.locator('iframe:visible').first()).toBeVisible()
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#fbfaf6')
  await menu(page)
  await page.getByRole('button', { name: '返回书架', exact: true }).tap()
  await expect(page).toHaveURL(/\/books$/)
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(16, 20, 18)')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#101412')
  await expect(page.locator('body')).toHaveCSS('color-scheme', 'dark')
})

test('explicit paper preference wins over system dark mode, including PDF', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => localStorage.setItem('book-reader-theme', 'paper'))
  await mock(page, { data: empty(), writes: 0 }, 'pdf')
  await open(page, 'pdf')
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(251, 250, 246)')
  await menu(page)
  await page.getByRole('button', { name: 'Reading preferences', exact: true }).tap()
  await page.getByRole('button', { name: '深色', exact: true }).tap()
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(25, 28, 25)')
})

test('EPUB follows container size changes without a window resize', async ({ page }) => {
  await mock(page, { data: empty(), writes: 0 })
  await open(page)
  await page.locator('.epub-viewport').evaluate(element => { element.style.height = '420px' })
  const frame = page.locator('.epub-viewport iframe:visible').first()
  await expect.poll(async () => (await frame.boundingBox())?.height).toBe(420)
  await expect(frame.contentFrame().locator('#p0')).toBeInViewport()
  await page.locator('.epub-viewport').evaluate(element => { element.style.height = '580px' })
  await expect.poll(async () => (await frame.boundingBox())?.height).toBe(580)
  await expect(frame.contentFrame().locator('#p0')).toBeInViewport()
})

test('EPUB opens when an initially collapsed viewport becomes measurable', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      style.id = 'collapsed-reader'
      style.textContent = '.epub-viewport { height: 0 !important; }'
      document.head.append(style)
    }, { once: true })
  })
  await mock(page, { data: empty(), writes: 0 })
  await page.goto('/books/1/read?file=7')
  await expect(page.locator('.epub-viewport')).toHaveCSS('height', '0px')
  await expect(page.getByText('正在排版，即将打开…', { exact: true })).toBeVisible()
  await page.locator('#collapsed-reader').evaluate(element => element.remove())
  await expect(page.locator('.epub-viewport iframe').first()).toBeVisible()
  await expect(page.locator('.reader-state')).toHaveCount(0)
  await expect(page.frameLocator('.epub-viewport iframe').locator('#p0')).toBeInViewport()
})

test('single row mobile controls, chapter notes and cloud position restore in a fresh context', async ({ page, browser }) => {
  const server: Server = { data: empty(), writes: 0 }
  await mock(page, server)
  await open(page)
  await menu(page)
  await expect(page.getByRole('button', { name: '阅读菜单', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /上一章|下一章/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '返回书架' }).locator('img')).toHaveAttribute('src', /avatars.githubusercontent.com/)
  await expect(page.getByText('已同步云端', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open table of contents', exact: true }).tap()
  await page.getByRole('button', { name: 'Chapter Two', exact: true }).tap()
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
    await other.addStyleTag({ content: '.reader-toc { max-height: 160px; }' })
    await other.getByRole('button', { name: 'Open table of contents', exact: true }).tap()
    await expect(other.getByRole('button', { name: 'Chapter Two', exact: true })).toBeInViewport({ ratio: 1 })
    await expect(other.getByRole('button', { name: 'Chapter Two', exact: true })).toHaveAttribute('aria-current', 'location')
    await other.getByRole('button', { name: 'Chapter One', exact: true }).tap()
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
  await page.getByRole('button', { name: '删除批注', exact: true }).tap()
  await expect.poll(() => server.data.entries.length).toBe(1)
  await page.getByRole('button', { name: '确认删除批注' }).tap()
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
  await page.getByRole('button', { name: 'Open table of contents' }).tap()
  await expect(page.getByRole('button', { name: 'Final chapter' })).toHaveAttribute('aria-current', 'location')
  await page.getByRole('button', { name: '关闭目录', exact: true }).tap()
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
  await page.getByRole('button', { name: 'Open table of contents', exact: true }).tap()
  await page.getByRole('button', { name: 'Chapter Two', exact: true }).tap()
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

test('signing in restores existing account progress instead of guest progress', async ({ page }) => {
  const server: Server = { data: { ...empty(), revision: 4, progress: { kind: 'pdf', page: 3, pages: 3 } }, writes: 0, guest: true }
  await mock(page, server, 'pdf')
  await open(page, 'pdf')
  await saveNote(page, '游客批注仍然保留', 'pdf')
  await menu(page)
  await expect(page.getByLabel('Current page')).toHaveValue('1')
  await page.getByRole('button', { name: 'Reading preferences', exact: true }).tap()
  await page.route('**/api/auth/google/start?*', async route => {
    server.guest = false
    await route.fulfill({ contentType: 'text/html', body: '<script>location.replace("/books/1/read?file=7")</script>' })
  })
  await page.getByRole('link', { name: '登录', exact: true }).tap()
  await expect.poll(() => server.data.entries[0]?.note).toBe('游客批注仍然保留')
  await expect(page.locator('.textLayer span').first()).toBeVisible()
  await menu(page)
  await expect(page.getByLabel('Current page')).toHaveValue('3')
  expect(server.data.progress).toEqual({ kind: 'pdf', page: 3, pages: 3 })
  await page.reload()
  await expect(page.locator('.textLayer span').first()).toBeVisible()
  await menu(page)
  await expect(page.getByLabel('Current page')).toHaveValue('3')
})

test('failed cloud read defers guest import until account progress is known', async ({ page }) => {
  const server: Server = { data: { ...empty(), revision: 4, progress: { kind: 'pdf', page: 3, pages: 3 } }, writes: 0, offline: true }
  await mock(page, server, 'pdf')
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const modulePath = '/src/lib/reader-state.ts'
    const { ReaderSession } = await import(modulePath)
    sessionStorage.setItem('reader-login:1:7', JSON.stringify({
      at: Date.now(), data: { revision: 0, progress: { kind: 'pdf', page: 1, pages: 3 }, entries: [], review: '', rating: null },
    }))
    const session = new ReaderSession(1, 7, 'pdf')
    await session.start()
    const snapshot = session.getSnapshot()
    session.dispose()
    return { status: snapshot.status, progress: snapshot.data.progress, intent: sessionStorage.getItem('reader-login:1:7') }
  })
  expect(result.status).toBe('error')
  expect(result.progress).toBeNull()
  expect(result.intent).not.toBeNull()
  expect(server.writes).toBe(0)
  server.offline = false
  await open(page, 'pdf')
  await menu(page)
  await expect(page.getByLabel('Current page')).toHaveValue('3')
  expect(await page.evaluate(() => sessionStorage.getItem('reader-login:1:7'))).toBeNull()
  expect(server.data.progress).toEqual({ kind: 'pdf', page: 3, pages: 3 })
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
  // setViewportSize finishes before ResizeObserver and EPUB.js finish reflowing.
  // Wait for the new chapter layout and its matching marker, not the old button
  // that can still be visible at the desktop coordinates for a few frames.
  await expect.poll(() => page.locator('.epub-viewport').evaluate(viewport => {
    const bounds = viewport.getBoundingClientRect()
    const frame = viewport.querySelector('iframe')
    const paragraph = frame?.contentDocument?.querySelector('#p0')
    const marker = document.querySelector('.reader-margin-note')
    if (!frame || !paragraph || !marker) return false
    const frameBounds = frame.getBoundingClientRect()
    if (Math.abs(frameBounds.height - bounds.height) > 1) return false
    const range = paragraph.ownerDocument.createRange()
    range.selectNodeContents(paragraph)
    const rect = Array.from(range.getClientRects()).filter(rect =>
      rect.right + frameBounds.left > bounds.left && rect.left + frameBounds.left < bounds.right &&
      rect.bottom + frameBounds.top > bounds.top && rect.top + frameBounds.top < bounds.bottom,
    ).at(-1)
    if (!rect) return false
    const markerBounds = marker.getBoundingClientRect()
    const x = Math.min(bounds.right - 12, Math.min(bounds.right, rect.right + frameBounds.left) + 8)
    const y = Math.max(bounds.top + 12, Math.max(bounds.top, rect.top + frameBounds.top) - 4)
    return Math.abs(markerBounds.x + markerBounds.width / 2 - x) < 2 &&
      Math.abs(markerBounds.y + markerBounds.height / 2 - y) < 2
  })).toBe(true)
  await page.getByRole('button', { name: '查看批注', exact: true }).tap()
  await expect(page.getByRole('dialog')).toContainText('随排版保留的段落批注')
})

for (const format of ['epub', 'pdf']) test(`${format} long press uses reader selection, handles and outside dismissal`, async ({ page, browserName }, testInfo) => {
  const server: Server = { data: empty(), writes: 0, guest: true }
  await mock(page, server, format)
  await open(page, format)
  const target = format === 'epub' ? page.frameLocator('iframe').locator('#p0') : page.locator('.textLayer span').first()
  await expect(target).toHaveCSS('-webkit-user-select', 'none')
  const point = await target.evaluate(element => {
    const range = element.ownerDocument.createRange()
    range.setStart(element.firstChild!, 1); range.setEnd(element.firstChild!, 2)
    const rect = range.getBoundingClientRect()
    return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
  })
  const offset = format === 'epub' ? (await page.locator('iframe').boundingBox())! : { x: 0, y: 0 }
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page)
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x + offset.x, y: point.y + offset.y }] })
    await expect(page.locator('.reader-selection-handle')).toHaveCount(2)
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await client.detach()
  } else {
    await target.evaluate((element, point) => element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: point.x, clientY: point.y })), point)
    await expect(page.locator('.reader-selection-handle')).toHaveCount(2)
    await target.evaluate(element => element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 1, isPrimary: true })))
  }
  expect(await target.evaluate(element => element.ownerDocument.defaultView!.getSelection()?.toString())).toBe('')
  expect(await target.evaluate(element => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    element.dispatchEvent(event)
    return event.defaultPrevented
  })).toBe(true)
  const handle = await page.locator('.reader-selection-handle[data-edge="end"]').boundingBox()
  const end = await target.evaluate(element => {
    const range = element.ownerDocument.createRange()
    range.setStart(element.firstChild!, 0); range.setEnd(element.firstChild!, Math.min(18, element.firstChild!.textContent!.length))
    const rect = Array.from(range.getClientRects()).at(-1)!
    return { x: rect.right - 1, y: (rect.top + rect.bottom) / 2 }
  })
  await page.mouse.move(handle!.x + 18, handle!.y + 18)
  await page.mouse.down()
  await page.mouse.move(end.x + offset.x, end.y + offset.y, { steps: 5 })
  await page.mouse.up()
  await page.getByRole('button', { name: '写批注', exact: true }).tap()
  await expect(page.getByRole('dialog').locator('blockquote')).toContainText(format === 'epub' ? 'Chapter One' : 'Reader')
  await expect(page.getByRole('textbox', { name: '批注内容' })).toHaveAttribute('placeholder', '写批注…')
  await page.screenshot({ path: testInfo.outputPath(`${format}-editor.png`) })
  await page.getByRole('button', { name: '关闭批注' }).tap()
  await target.evaluate(element => {
    const range = element.ownerDocument.createRange()
    range.selectNodeContents(element)
    const selection = element.ownerDocument.defaultView!.getSelection()!
    selection.removeAllRanges(); selection.addRange(range)
    element.ownerDocument.dispatchEvent(new Event('selectionchange'))
  })
  await expect(page.getByRole('button', { name: '写批注', exact: true })).toBeVisible()
  const size = page.viewportSize()!
  await page.touchscreen.tap(size.width / 2, size.height * .75)
  await expect(page.getByRole('button', { name: '写批注', exact: true })).toHaveCount(0)
  await expect(page.locator('.reader-selected-text')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open table of contents' })).not.toBeVisible()
})

test('note marker sits at the selected text end, above its first glyph edge', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0, guest: true }
  await mock(page, server)
  await open(page)
  const target = page.frameLocator('iframe').locator('#p0')
  const rect = await target.evaluate(element => {
    const range = element.ownerDocument.createRange()
    range.setStart(element.firstChild!, 0); range.setEnd(element.firstChild!, 11)
    const selection = element.ownerDocument.defaultView!.getSelection()!
    selection.removeAllRanges(); selection.addRange(range)
    element.ownerDocument.dispatchEvent(new Event('selectionchange'))
    return range.getBoundingClientRect().toJSON()
  })
  const frame = (await page.locator('iframe').boundingBox())!
  await page.getByRole('button', { name: '写批注', exact: true }).tap()
  await page.getByRole('textbox', { name: '批注内容' }).fill('一句笔记')
  await page.getByRole('button', { name: '保存批注' }).tap()
  const marker = page.getByRole('button', { name: '查看批注', exact: true })
  await expect(marker).toBeVisible()
  const box = (await marker.boundingBox())!
  expect(Math.abs(box.x + box.width / 2 - (frame.x + rect.right + 8))).toBeLessThan(2)
  expect(Math.abs(box.y + box.height / 2 - (frame.y + rect.top - 4))).toBeLessThan(2)
})


test('desktop selection dismisses outside and still opens a concise note editor', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false })
  try {
    const page = await context.newPage()
    await mock(page, { data: empty(), writes: 0, guest: true })
    await open(page)
    const target = page.frameLocator('iframe').locator('#p0')
    const frame = (await page.locator('iframe').boundingBox())!
    const point = await target.evaluate(element => {
      const range = element.ownerDocument.createRange()
      range.setStart(element.firstChild!, 8); range.setEnd(element.firstChild!, 9)
      const rect = range.getBoundingClientRect()
      return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
    })
    await page.mouse.dblclick(frame.x + point.x, frame.y + point.y)
    await expect(page.getByRole('button', { name: '写批注', exact: true })).toBeVisible()
    expect(await target.evaluate(element => element.ownerDocument.defaultView!.getSelection()?.toString())).not.toBe('')
    await page.mouse.click(500, 760)
    await expect(page.getByRole('button', { name: '写批注', exact: true })).toHaveCount(0)
    expect(await target.evaluate(element => element.ownerDocument.defaultView!.getSelection()?.toString())).toBe('')
    await page.mouse.dblclick(frame.x + point.x, frame.y + point.y)
    await page.getByRole('button', { name: '写批注', exact: true }).click()
    await page.getByRole('textbox', { name: '批注内容' }).fill('桌面批注')
    await page.getByRole('button', { name: '保存批注' }).click()
    await page.getByRole('button', { name: '查看批注', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('桌面批注')
  } finally { await context.close() }
})

for (const gesture of [
  { name: 'short slow swipe', dx: -50, pause: 150, turns: true },
  { name: 'single-move quick flick', dx: -30, pause: 20, turns: true },
  { name: 'small slow drag', dx: -20, pause: 150, turns: false },
  { name: 'cancelled swipe', dx: -80, pause: 20, cancel: true, turns: false },
  { name: 'second finger cancels swipe', dx: -80, pause: 20, multi: true, turns: false },
]) {
  test(`paginated EPUB handles ${gesture.name}`, async ({ page }) => {
    await mock(page, { data: empty(), writes: 0 })
    await open(page)
    const stage = page.locator('.epub-container')
    const before = await stage.evaluate(element => element.scrollLeft)
    await page.locator('iframe:visible').first().evaluate(async (element, gesture) => {
      const frame = element as HTMLIFrameElement
      const doc = frame.contentDocument!
      const view = frame.contentWindow! as Window & typeof globalThis
      const origin = frame.getBoundingClientRect().left + 220
      const send = (type: string, dx: number, id = 1) => doc.body.dispatchEvent(new view.PointerEvent(type, {
        bubbles: true, pointerType: 'touch', pointerId: id, isPrimary: id === 1,
        clientX: origin + dx - frame.getBoundingClientRect().left, clientY: 250,
      }))
      send('pointerdown', 0)
      await new Promise(resolve => setTimeout(resolve, gesture.pause))
      send('pointermove', gesture.dx)
      if (gesture.multi) send('pointerdown', gesture.dx, 2)
      // Release at the same physical position even though the iframe moved.
      send(gesture.cancel ? 'pointercancel' : 'pointerup', gesture.dx)
      if (gesture.multi) send('pointerup', gesture.dx, 2)
    }, gesture)
    if (gesture.turns) await expect.poll(() => stage.evaluate(element => element.scrollLeft)).toBeGreaterThan(before)
    else {
      await expect(page.locator('.epub-reader')).not.toHaveClass(/is-page-sliding/)
      expect(await stage.evaluate(element => element.scrollLeft)).toBe(before)
    }
  })
}

test('native diagonal touch swipe turns a paginated EPUB page', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native touch injection requires Chromium CDP')
  await mock(page, { data: empty(), writes: 0 })
  await open(page)
  const stage = page.locator('.epub-container')
  const before = await stage.evaluate(element => element.scrollLeft)
  const session = await page.context().newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 260, y: 320 }] })
  // Start vertically, then sweep sideways: the browser must not take over panning.
  for (const [x, y] of [[258, 345], [240, 350], [210, 355], [175, 360]]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => stage.evaluate(element => element.scrollLeft)).toBeGreaterThan(before)
  await session.detach()
})

test('a passage can be highlighted first, then opened by tapping it to add a thought', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0 }
  await mock(page, server)
  await open(page)
  const target = page.locator('iframe').last().contentFrame().locator('#p0')
  const point = await target.evaluate(element => {
    const range = element.ownerDocument.createRange()
    range.setStart(element.firstChild!, 0); range.setEnd(element.firstChild!, 30)
    const selection = element.ownerDocument.defaultView!.getSelection()!
    selection.removeAllRanges(); selection.addRange(range)
    element.ownerDocument.dispatchEvent(new Event('selectionchange'))
    const rect = range.getClientRects()[0]
    return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
  })
  await page.getByRole('button', { name: '划线', exact: true }).tap()
  await expect.poll(() => server.data.entries[0]?.note).toBe('')
  // A highlight without a thought has no margin marker; the text itself opens it.
  await expect(page.getByRole('button', { name: '查看批注', exact: true })).toHaveCount(0)
  const frame = (await page.locator('iframe').last().boundingBox())!
  await page.touchscreen.tap(frame.x + point.x, frame.y + point.y)
  await expect(page.getByRole('dialog', { name: '段落批注' })).toContainText('划线')
  await page.getByRole('button', { name: '编辑批注' }).tap()
  await page.getByRole('textbox', { name: '批注内容' }).fill('后补的想法')
  await page.getByRole('button', { name: '保存批注' }).tap()
  await expect.poll(() => server.data.entries[0]?.note).toBe('后补的想法')
  await expect(page.getByRole('button', { name: '查看批注', exact: true })).toBeVisible()
})

test('the drawer lists every note in the book and jumps to the chosen one', async ({ page }) => {
  const server: Server = { data: empty(), writes: 0 }
  await mock(page, server)
  await open(page)
  await menu(page)
  await page.getByRole('button', { name: 'Open table of contents', exact: true }).tap()
  await page.getByRole('tab', { name: '批注' }).tap()
  await expect(page.locator('.reader-notes-empty')).toBeVisible()
  await page.getByRole('button', { name: '关闭目录', exact: true }).tap()
  await saveNote(page, '列表里的批注')
  await menu(page)
  await page.getByRole('button', { name: 'Open table of contents', exact: true }).tap()
  // The drawer remembers the last tab and shows the count.
  await expect(page.getByRole('tab', { name: '批注 1' })).toHaveAttribute('aria-selected', 'true')
  const item = page.getByRole('list', { name: '全书批注' }).getByRole('button')
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('列表里的批注')
  await expect(item).toContainText('Chapter One')
  await item.tap()
  await expect(page.locator('.reader-toc')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '查看批注', exact: true })).toBeVisible()
})
