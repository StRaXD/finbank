import { afterEach, describe, expect, it, vi } from 'vitest'
import { downscaleToJpegDataUrl, fitWithin } from './avatar.ts'

describe('fitWithin', () => {
  it.each([
    ['landscape', 2000, 1000, { width: 256, height: 128 }],
    ['portrait', 600, 1200, { width: 128, height: 256 }],
    ['square', 512, 512, { width: 256, height: 256 }],
    ['exactly the limit', 256, 100, { width: 256, height: 100 }],
    ['small (not upscaled)', 120, 80, { width: 120, height: 80 }],
    ['very thin (at least 1px)', 5000, 2, { width: 256, height: 1 }],
  ])('%s: %i×%i', (_name, width, height, expected) => {
    expect(fitWithin(width, height)).toEqual(expected)
  })

  it('takes a custom limit', () => {
    expect(fitWithin(400, 200, 100)).toEqual({ width: 100, height: 50 })
  })
})

describe('downscaleToJpegDataUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubCanvas(dataUrl = 'data:image/jpeg;base64,STUB') {
    const calls: string[] = []
    const context = {
      fillStyle: '',
      imageSmoothingQuality: 'low' as ImageSmoothingQuality,
      fillRect: vi.fn((...args: number[]) => calls.push(`fillRect(${args.join(',')}) with ${context.fillStyle}`)),
      drawImage: vi.fn((_image: unknown, ...args: number[]) =>
        calls.push(`drawImage(${args.join(',')}) smoothing ${context.imageSmoothingQuality}`),
      ),
    }
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const toDataURL = vi.spyOn(canvas, 'toDataURL').mockReturnValue(dataUrl)
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'canvas' ? canvas : createElement(tag),
    )
    return { canvas, context, toDataURL, calls }
  }

  it('fills white, draws the fitted image and encodes a JPEG at 0.85', async () => {
    const bitmap = { width: 2000, height: 1000, close: vi.fn() }
    const createImageBitmap = vi.fn((_image: Blob, _options?: ImageBitmapOptions) => Promise.resolve(bitmap))
    vi.stubGlobal('createImageBitmap', createImageBitmap)
    const { canvas, context, toDataURL, calls } = stubCanvas()
    const blob = new Blob(['png'], { type: 'image/png' })

    await expect(downscaleToJpegDataUrl(blob)).resolves.toBe('data:image/jpeg;base64,STUB')
    expect(createImageBitmap).toHaveBeenCalledWith(blob, { imageOrientation: 'from-image' })
    expect(canvas.width).toBe(256)
    expect(canvas.height).toBe(128)
    // White first (PNG transparency), then the image on top.
    expect(calls).toEqual(['fillRect(0,0,256,128) with white', 'drawImage(0,0,256,128) smoothing high'])
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 256, 128)
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85)
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('rejects when the image cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(() => Promise.reject(new DOMException('bad', 'InvalidStateError'))))
    await expect(downscaleToJpegDataUrl(new Blob(['garbage'], { type: 'image/png' }))).rejects.toThrow()
  })

  it('rejects when the browser cannot encode a JPEG, and still releases the bitmap', async () => {
    const bitmap = { width: 10, height: 10, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn(() => Promise.resolve(bitmap)))
    stubCanvas('data:image/png;base64,STUB')
    await expect(downscaleToJpegDataUrl(new Blob(['x'], { type: 'image/png' }))).rejects.toThrow()
    expect(bitmap.close).toHaveBeenCalled()
  })
})
