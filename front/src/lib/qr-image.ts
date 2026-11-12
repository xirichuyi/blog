// Read a QR code out of an image (a screenshot, a photo, a saved PNG). The
// decoder is loaded on demand and runs locally; the image never leaves the page.

const MAX_SIDE = 2000

function pixels(bitmap: ImageBitmap, scale: number): ImageData | null {
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  // Transparent PNGs would otherwise decode as black-on-black.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingEnabled = scale < 1
  context.drawImage(bitmap, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

/** The text of the first QR code found in the image, or null when there is none. */
export async function decodeQrImage(image: Blob): Promise<string | null> {
  const [{ default: jsQR }, bitmap] = await Promise.all([import('jsqr'), createImageBitmap(image)])
  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    const fit = Math.min(1, MAX_SIDE / longest)
    // A small code inside a large screenshot, or a tiny cropped code, often
    // only resolves at a different scale, so try a few.
    const scales = [fit, fit * 0.5, longest < 600 ? 2 : fit * 0.75]
    for (const scale of scales) {
      const data = pixels(bitmap, scale)
      if (!data) return null
      const result = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' })
      if (result?.data) return result.data
    }
    return null
  } finally {
    bitmap.close()
  }
}
