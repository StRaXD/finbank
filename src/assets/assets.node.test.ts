// @vitest-environment node
// Every brand asset and the avatar placeholder exists and is a root <svg> with a usable viewBox.
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const assetsDir = resolve(import.meta.dirname)

const files = [
  'brands/wordmark-teal.svg',
  'brands/wordmark-white.svg',
  'brands/google.svg',
  'brands/mastercard.svg',
  'brands/visa.svg',
  'brands/figma.svg',
  'brands/adobe.svg',
  'avatar-placeholder.svg',
]

describe('brand assets', () => {
  it.each(files)('%s is an <svg> with a viewBox', (rel) => {
    const file = join(assetsDir, rel)
    expect(existsSync(file), `${rel} is missing`).toBe(true)
    const source = readFileSync(file, 'utf8').trim()

    const root = /^(?:<\?xml[^>]*\?>\s*)?<svg\b([^>]*)>/.exec(source)
    expect(root, `${rel} does not start with an <svg> element`).not.toBeNull()
    expect(source.endsWith('</svg>'), `${rel} does not end with </svg>`).toBe(true)

    const viewBox = /\sviewBox="([^"]+)"/.exec(root![1])
    expect(viewBox, `${rel} has no viewBox`).not.toBeNull()
    const parts = viewBox![1].trim().split(/[\s,]+/).map(Number)
    expect(parts).toHaveLength(4)
    expect(parts.every(Number.isFinite)).toBe(true)
    expect(parts[2]).toBeGreaterThan(0)
    expect(parts[3]).toBeGreaterThan(0)
  })
})
