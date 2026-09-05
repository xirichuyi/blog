import { test, expect, type Page } from '@playwright/test'
import { serializeVideo } from '../src/lib/blog-video'

const markdown = `## 原文保真

| 名称 | 数量 |
| --- | --- |
| 视频 | 2 |

- [x] 完成
- [ ] 待办

[网站][blog]
![图片][photo]

[blog]: https://example.com "标题"
[photo]: https://example.com/photo.png

:::gallery
![一](<https://example.com/one.png>)
![二](<https://example.com/two.png>)
:::

:::video {src="https://example.com/movie.mp4" title="视频"} :::

\`\`\`rust
fn main() { println!("中文"); }
\`\`\`
`

async function setup(page: Page) {
  let content = markdown
  const writes: string[] = []
  await page.route('https://example.com/**', route => route.fulfill({ status: 204 }))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path === '/api/auth/session') data = { name: 'Owner', email: 'owner@example.com' }
    if (path === '/api/admin/posts/42') {
      if (route.request().method() === 'PUT') {
        content = route.request().postDataJSON().content
        writes.push(content)
      }
      data = { id: 42, title: '保真测试', content, status: 1, tags: [], created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString() }
    }
    await route.fulfill({ json: { code: 200, message: 'ok', data } })
  })
  await page.goto('/admin/posts/42')
  await expect(page.getByRole('textbox', { name: 'Markdown 原文' })).toBeVisible({ timeout: 15000 })
  return writes
}

test('Markdown source survives preview, save and reload with custom media styles', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const writes = await setup(page)
  await page.getByRole('button', { name: '预览', exact: true }).click()
  const preview = page.getByLabel('文章预览')
  await expect(preview.locator('.md-table-wrap table')).toBeVisible()
  await expect(preview.locator('input[type=checkbox]').first()).toBeChecked()
  await expect(preview.locator('a[href="https://example.com"]')).toBeVisible()
  await expect(preview.locator('video')).toHaveAttribute('src', 'https://example.com/movie.mp4')
  await expect(preview.locator('.md-gallery')).toHaveCount(1)
  await page.getByRole('button', { name: '更新', exact: true }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0]).toBe(markdown)
  await page.getByRole('button', { name: '源码', exact: true }).click()
  const source = page.getByRole('textbox', { name: 'Markdown 原文' })
  await source.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.insertText('新增正文')
  await page.getByRole('button', { name: '更新', exact: true }).click()
  await expect.poll(() => writes.length).toBe(2)
  expect(writes[1]).toBe(markdown + '新增正文')
  await page.reload()
  await expect(source).toContainText('新增正文')
  expect(errors).toEqual([])
})

test('existing toolbar inserts Markdown and undo restores the source', async ({ page }) => {
  const writes = await setup(page)
  const source = page.getByRole('textbox', { name: 'Markdown 原文' })
  await source.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Control+b')
  await expect(source).toContainText('**文字**')
  await page.getByRole('button', { name: '撤销 (⌘Z)', exact: true }).click()
  await page.getByRole('button', { name: '更新', exact: true }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0]).toBe(markdown)
})

test('mobile source and preview stay within the viewport in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await setup(page)
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'), dark)
    for (const mode of ['源码', '分屏', '预览']) {
      await page.getByRole('button', { name: mode, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
  await page.screenshot({ path: '/tmp/markdown-editor-mobile-preview.png', fullPage: true })
})


test('image completion preserves the source and follows its original insertion position', async ({ page }) => {
  const writes = await setup(page)
  let finishSession!: () => void
  const pending = new Promise<void>(resolve => { finishSession = resolve })
  let started = false
  await page.route('**/api/admin/uploads', async route => {
    started = true
    await pending
    await route.fulfill({ json: { code: 200, message: 'ok', data: {
      mode: 'single', key: 'image.png', public_url: 'https://example.com/uploaded.png',
      upload_url: 'http://127.0.0.1:4175/mock-upload',
    } } })
  })
  await page.route('**/mock-upload', route => route.fulfill({ status: 200 }))
  const source = page.getByRole('textbox', { name: 'Markdown 原文' })
  await source.click()
  await page.keyboard.press('Control+End')
  await page.locator('.admin-editor-surface input[accept="image/*"]').first().setInputFiles({
    name: '测试.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uoAAAAASUVORK5CYII=', 'base64'),
  })
  await expect.poll(() => started).toBe(true)
  await source.click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.insertText('前面补充\n')
  await page.keyboard.press('Control+A')
  finishSession()
  await expect(source).toContainText('uploaded.png')
  await page.getByRole('button', { name: '更新', exact: true }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0]).toBe('前面补充\n' + markdown + '\n\n![测试](<https://example.com/uploaded.png>)\n\n')
})

test('new video directives render through the existing article component', async ({ page }) => {
  await setup(page)
  const source = page.getByRole('textbox', { name: 'Markdown 原文' })
  await source.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText(serializeVideo({ src: 'https://example.com/new.mp4', title: '原画视频', width: 1920, height: 1080 }))
  await page.getByRole('button', { name: '预览', exact: true }).click()
  await expect(page.getByLabel('文章预览').locator('video')).toHaveAttribute('src', 'https://example.com/new.mp4')
})

test('save is single-flight and preserves edits made while the request is pending', async ({ page }) => {
  await setup(page)
  let requests = 0
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/admin/posts/42', async route => {
    if (route.request().method() !== 'PUT') return route.fallback()
    requests++
    await pending
    await route.fulfill({ json: { code: 200, message: 'ok', data: { id: 42 } } })
  })
  const title = page.getByRole('textbox', { name: '文章标题' })
  await title.fill('第一次保存')
  await title.press('Control+s')
  await expect.poll(() => requests).toBe(1)
  await title.fill('请求期间的新标题')
  await title.press('Control+s')
  release()
  await expect(page.getByRole('button', { name: '更新', exact: true })).toBeEnabled()
  await expect(title).toHaveValue('请求期间的新标题')
  expect(requests).toBe(1)
  await expect(page.locator('.admin-editor-save-state')).toHaveText('已备份到本机')
})

test('leaving immediately flushes the latest draft', async ({ page }) => {
  await setup(page)
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('textbox', { name: '文章标题' }).fill('离开前最后输入')
  await page.getByRole('button', { name: '返回文章' }).click()
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('chuyi:post-draft:42') || 'null'))
  expect(draft.title).toBe('离开前最后输入')
})

test('failed article image offers the original URL instead of opening a broken lightbox', async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/posts/42'
      ? { id: 42, title: '图片失败提示', content: '![图片](https://example.com/missing.png)', status: 1, tags: [], created_at: '2026-01-01T00:00:00Z' }
      : path.endsWith('/adjacent') ? { newer: null, older: null } : []
    return route.fulfill({ json: { code: 200, message: 'ok', data } })
  })
  await page.route('https://example.com/**', route => route.fulfill({ status: 404 }))
  await page.goto('/article/42')
  await expect(page.getByText('图片暂时无法加载，点击打开原图')).toBeVisible({ timeout: 15000 })
  const link = page.locator('.md-image-frame')
  await expect(link).not.toHaveAttribute('data-zoomable', 'true')
  await expect(link).toHaveAttribute('href', 'https://example.com/missing.png')
})
