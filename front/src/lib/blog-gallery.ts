export interface BlogGalleryItem {
  src: string
  alt?: string
}

export const GALLERY_ALT_PREFIX = 'BLOGGALLERY:'

const GALLERY_DIRECTIVE_PATTERN = /^:::gallery[\t ]*\r?\n([\s\S]*?)\r?\n:::[\t ]*(?=\r?\n|$)/gm
const MARKDOWN_IMAGE_PATTERN = /^\s*!\[((?:\\.|[^\]\\])*)\]\((?:<([^>\r\n]+)>|([^\s)]+))(?:\s+(?:"([^"]*)"|'([^']*)'))?\)\s*$/

export function normalizeGalleryItems(value: unknown): BlogGalleryItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const source = String((item as BlogGalleryItem).src ?? '').trim()
    if (!source) return []
    const alt = String((item as BlogGalleryItem).alt ?? '').trim()
    return [{ src: source, ...(alt ? { alt } : {}) }]
  })
}

export function parseGalleryBody(body: string): BlogGalleryItem[] {
  return body.split(/\r?\n/).flatMap((line) => {
    if (!line.trim()) return []
    const match = line.match(MARKDOWN_IMAGE_PATTERN)
    if (!match) return []
    return [{
      src: match[2] || match[3],
      alt: unescapeMarkdownText(match[1]),
    }]
  })
}

export function serializeGallery(items: BlogGalleryItem[]): string {
  const images = normalizeGalleryItems(items)
    .map((item) => `![${escapeMarkdownText(item.alt ?? '')}](<${item.src.replace(/>/g, '%3E')}>)`)
    .join('\n')
  return `:::gallery\n${images}\n:::`
}

export function replaceGalleryDirectives(
  markdown: string,
  replacement: (items: BlogGalleryItem[]) => string,
): string {
  return markdown.replace(GALLERY_DIRECTIVE_PATTERN, (directive, body: string) => {
    const items = parseGalleryBody(body)
    return items.length >= 2 ? replacement(items) : directive
  })
}

export function encodeGalleryItems(items: BlogGalleryItem[]): string {
  return encodeURIComponent(JSON.stringify(normalizeGalleryItems(items)))
}

export function decodeGalleryItems(value: string): BlogGalleryItem[] {
  try {
    return normalizeGalleryItems(JSON.parse(decodeURIComponent(value)))
  } catch {
    return []
  }
}

function escapeMarkdownText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/([\[\]])/g, '\\$1').replace(/[\r\n]+/g, ' ')
}

function unescapeMarkdownText(value: string): string {
  return value.replace(/\\([\\\[\]])/g, '$1')
}
