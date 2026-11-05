// Explicit colors avoid WebKit's transient empty computed styles on route load.
// Blog colors match --background in index.css; reader colors match BookReader.css.
export function syncDocumentTheme() {
  const root = document.documentElement
  const reader = root.getAttribute('data-reader-theme')
  const dark = reader ? reader === 'night' : root.getAttribute('data-theme') === 'dark'
  const color = reader ? (dark ? '#191c19' : '#fbfaf6') : (dark ? '#101412' : '#faf8f5')
  root.style.backgroundColor = color
  root.style.colorScheme = dark ? 'dark' : 'light'
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = color
}
