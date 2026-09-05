export interface BlogVideoAttributes {
  src: string
  title?: string
  width?: number
  height?: number
}

// Keep the existing stored directive compatible with the public article renderer.
export function serializeVideo(video: BlogVideoAttributes): string {
  const attributes = Object.entries(video).flatMap(([name, value]) => {
    if (value == null || value === '') return []
    if (name === 'width' || name === 'height') {
      return Number.isFinite(Number(value)) && Number(value) > 0
        ? [`${name}="${Math.round(Number(value))}"`] : []
    }
    const safe = String(value).replace(/[\r\n]/g, ' ').replace(/"/g, name === 'title' ? '”' : '%22')
    return [`${name}="${safe}"`]
  })
  return `:::video {${attributes.join(' ')}} :::`
}
