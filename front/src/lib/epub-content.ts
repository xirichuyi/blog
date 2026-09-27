import DOMPurify from 'dompurify'

/**
 * WebKit blocks even parent-owned event listeners in script-disabled frames:
 * https://bugs.webkit.org/show_bug.cgi?id=218086
 * Permit the reader's event listeners, but never book scripts. Every chapter is
 * sanitized BEFORE loading and receives a leading script-src 'none' policy.
 * Keep this paired with EpubReader's allowScriptedContent setting.
 */
export function prepareEpubContent(source: string, sectionUrl: string): string {
  const root = DOMPurify.sanitize(source, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: true,
    ADD_TAGS: ['link'],
    // Extend DOMPurify's default URI policy only for EPUB.js archive blob URLs.
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'meta', 'base'],
    FORBID_ATTR: ['srcdoc', 'autofocus'],
  }) as HTMLElement
  const doc = root.ownerDocument
  const head = root.querySelector('head')!
  const policy = doc.createElement('meta')
  policy.setAttribute('http-equiv', 'Content-Security-Policy')
  policy.setAttribute('content', "script-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'self'")
  head.prepend(policy)
  // EPUB.js resolves relative chapter links against this base; never retain a
  // base supplied by the book. Archived resources have already become blob URLs.
  const base = doc.createElement('base')
  base.href = new URL(sectionUrl, window.location.href).href
  head.insertBefore(base, policy.nextSibling)
  return '<!doctype html>' + root.outerHTML
}
