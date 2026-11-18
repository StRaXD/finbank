// The mock adapter's profile photo encoder: a picked image becomes a small JPEG data URL, so no
// full-size image is ever stored.

/** The longest side, in pixels, a stored avatar may have. */
export const AVATAR_MAX_SIDE = 256

/** JPEG quality of the stored avatar. */
const JPEG_QUALITY = 0.85

/**
 * The size of a `width` × `height` image scaled to fit within `max` × `max`, keeping its aspect
 * ratio. It never upscales, and each side is at least 1px.
 */
export function fitWithin(width: number, height: number, max = AVATAR_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Decodes `image` and redraws it, fitted within 256px, as a JPEG data URL (quality 0.85). The
 * canvas is filled white first, so transparent PNG areas do not turn black. Rejects when the
 * image cannot be decoded or drawn.
 */
export async function downscaleToJpegDataUrl(image: Blob): Promise<string> {
  // Applies EXIF orientation, so phone photos are not stored sideways.
  const bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No 2D canvas context.')
    context.fillStyle = 'white'
    context.fillRect(0, 0, width, height)
    // A multi-megapixel photo shrinks a lot; high-quality smoothing keeps it clean.
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (!dataUrl.startsWith('data:image/jpeg')) throw new Error('JPEG encoding is unavailable.')
    return dataUrl
  } finally {
    bitmap.close()
  }
}
