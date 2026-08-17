import { createAtomBlockMarkdownSpec, mergeAttributes, Node } from '@tiptap/core'

export interface BlogVideoAttributes {
  src: string
  title?: string
  width?: number
  height?: number
}

const blogVideoMarkdown = createAtomBlockMarkdownSpec({
  nodeName: 'blogVideo',
  name: 'video',
  requiredAttributes: ['src'],
  allowedAttributes: ['src', 'title', 'width', 'height'],
  serializeAttributes(attributes) {
    return [
      serializeAttribute('src', attributes.src),
      serializeAttribute('title', sanitizeTitle(attributes.title)),
      serializeDimension('width', attributes.width),
      serializeDimension('height', attributes.height),
    ].filter(Boolean).join(' ')
  },
})

export const BlogVideo = Node.create({
  name: 'blogVideo',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'video[data-blog-video][src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        'data-blog-video': 'true',
        controls: 'true',
        playsinline: 'true',
        preload: 'metadata',
      }),
    ]
  },

  parseMarkdown: blogVideoMarkdown.parseMarkdown,
  markdownTokenizer: blogVideoMarkdown.markdownTokenizer,
  renderMarkdown: blogVideoMarkdown.renderMarkdown,
})

function serializeAttribute(name: string, value: unknown): string {
  if (value == null || value === '') return ''
  const safeValue = String(value).replace(/["\r\n]/g, (character) => character === '"' ? '%22' : ' ')
  return `${name}="${safeValue}"`
}

function serializeDimension(name: string, value: unknown): string {
  const dimension = Number(value)
  return Number.isFinite(dimension) && dimension > 0
    ? `${name}="${Math.round(dimension)}"`
    : ''
}

function sanitizeTitle(value: unknown): string {
  return String(value ?? '').replace(/"/g, '”')
}
