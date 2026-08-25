import { mergeAttributes, Node, type MarkdownParseHelpers, type MarkdownToken, type MarkdownTokenizer } from '@tiptap/core'
import {
  normalizeGalleryItems,
  parseGalleryBody,
  serializeGallery,
  type BlogGalleryItem,
} from '@/lib/blog-gallery'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blogGallery: {
      setBlogGallery: (items: BlogGalleryItem[]) => ReturnType
    }
  }
}

const galleryTokenizer: MarkdownTokenizer = {
  name: 'blogGallery',
  level: 'block',
  start(src) {
    return src.match(/^:::gallery[\t ]*$/m)?.index ?? -1
  },
  tokenize(src) {
    const match = src.match(/^:::gallery[\t ]*\r?\n([\s\S]*?)\r?\n:::[\t ]*(?:\r?\n|$)/)
    if (!match) return undefined
    const items = parseGalleryBody(match[1])
    if (items.length < 2) return undefined
    return {
      type: 'blogGallery',
      raw: match[0],
      attributes: { items },
    }
  },
}

export const BlogGallery = Node.create({
  name: 'blogGallery',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      items: {
        default: [],
        parseHTML: (element) => {
          try {
            return normalizeGalleryItems(JSON.parse(element.getAttribute('data-gallery-items') || '[]'))
          } catch {
            return []
          }
        },
        renderHTML: (attributes) => ({
          'data-gallery-items': JSON.stringify(normalizeGalleryItems(attributes.items)),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-blog-gallery]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const items = normalizeGalleryItems(node.attrs.items)
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-blog-gallery': 'true',
        class: 'editor-gallery',
      }),
      ...items.map((item) => [
        'figure',
        { class: 'editor-gallery-item' },
        ['img', { src: item.src, alt: item.alt ?? '', draggable: 'false' }],
        ...(item.alt ? [['figcaption', {}, item.alt]] : []),
      ]),
      ['span', { class: 'editor-gallery-hint' }, `${items.length} 张照片 · 左右滑动`],
    ]
  },

  addCommands() {
    return {
      setBlogGallery: (items) => ({ commands }) => {
        const normalizedItems = normalizeGalleryItems(items)
        return normalizedItems.length >= 2
          ? commands.insertContent({ type: this.name, attrs: { items: normalizedItems } })
          : false
      },
    }
  },

  parseMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers) {
    return helpers.createNode('blogGallery', {
      items: normalizeGalleryItems(token.attributes?.items),
    }, [])
  },

  markdownTokenizer: galleryTokenizer,

  renderMarkdown(node) {
    return serializeGallery(normalizeGalleryItems(node.attrs?.items))
  },
})
