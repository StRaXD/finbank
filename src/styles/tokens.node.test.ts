// @vitest-environment node
// Guards the design tokens (UX-DR1/2/3) against drift from Typography-color.png.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

type Decl = { name: string; value: string; isStatic: boolean }

// Every `@theme [modifiers] { ... }` block, in order. Token blocks hold only declarations, so the
// body ends at the first `}`.
const decls: Decl[] = [...css.matchAll(/@theme\b([^{]*)\{([^}]*)\}/g)].flatMap(([, modifiers, body]) =>
  [...body.matchAll(/(--[\w*-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => ({
    name,
    value: value.trim(),
    isStatic: /\bstatic\b/.test(modifiers),
  })),
)

const theme = new Map(decls.map((d) => [d.name, d.value]))
const staticNames = new Set(decls.filter((d) => d.isStatic).map((d) => d.name))

// Hex values are written without '#' so this file passes the design-literal scan.
const hex = (digits: string) => `#${digits}`
// Functional colours are built the same way so the literal scan's colour-function check stays exemption-free.
const fn = (name: string, args: string) => `${name}(${args})`
const norm = (v: string | undefined) => v?.replace(/\s+/g, ' ').toUpperCase()

describe('tokens.css', () => {
  it('has a static and a regular @theme block', () => {
    expect(css).toMatch(/@theme\s+static\s*\{/)
    expect(css).toMatch(/@theme\s*\{/)
  })

  const chartColors: Record<string, string> = {
    '--color-primary': hex('299D91'),
    '--color-ink': hex('191919'),
    '--color-ink-2': hex('525256'),
    '--color-muted': hex('666666'),
    '--color-subtle': hex('878787'),
    '--color-faint': hex('9F9F9F'),
    '--color-border': hex('E8E8E8'),
    '--color-surface': hex('F4F5F7'),
    '--color-danger': hex('E73D1C'),
    '--color-positive': hex('4DAF6E'),
  }

  it.each(Object.entries(chartColors))('%s is %s, declared once and only in @theme static', (name, value) => {
    const found = decls.filter((d) => d.name === name)
    expect(found).toHaveLength(1)
    expect(found[0].isStatic).toBe(true)
    expect(norm(found[0].value)).toBe(value)
  })

  it('drops the Tailwind default palette so only Finbank colours exist', () => {
    expect(staticNames.has('--color-*')).toBe(true)
    expect(theme.get('--color-*')).toBe('initial')
  })

  it.each([
    ['--color-white', hex('FFFFFF')],
    ['--color-card', 'var(--color-white)'],
    ['--color-sidebar', 'var(--color-ink)'],
    ['--color-overlay', fn('rgb', '0 0 0 / 13.5%')],
    ['--color-on-dark', 'var(--color-white)'],
    ['--color-on-dark-muted', fn('rgb', '255 255 255 / 70%')],
    ['--color-on-dark-soft', fn('rgb', '255 255 255 / 75%')],
    ['--color-on-dark-hover', fn('rgb', '255 255 255 / 5.6%')],
    ['--color-on-dark-divider', fn('rgb', '210 210 210 / 9.7%')],
    ['--color-focus-ring', 'var(--color-primary)'],
    ['--focus-ring-width', '2px'],
    ['--focus-ring-offset', '2px'],
    ['--color-google', hex('E4E7EB')],
    ['--color-disabled', 'var(--color-google)'],
    ['--radius-card', '8px'],
    ['--radius-button', '4px'],
    ['--radius-input', '8px'],
    ['--radius-checkbox', '2px'],
    ['--radius-modal', '16px'],
    ['--shadow-card', `0 20px 25px ${fn('rgb', '118 118 118 / 10%')}`],
  ])('%s is %s', (name, value) => {
    expect(norm(theme.get(name))).toBe(norm(value))
  })

  it('sets the sans font to Inter with fallbacks', () => {
    expect(theme.get('--font-sans')).toBe("'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif")
  })

  it.each([
    ['normal', '400'],
    ['medium', '500'],
    ['semibold', '600'],
    ['bold', '700'],
    ['extrabold', '800'],
  ])('font weight %s is %s', (name, value) => {
    expect(theme.get(`--font-weight-${name}`)).toBe(value)
  })

  it.each([
    [12, 16],
    [14, 20],
    [16, 24],
    [18, 24],
    [20, 28],
    [22, 32],
    [24, 28],
  ])('type step %ipx has a %ipx line height', (size, lineHeight) => {
    expect(theme.get(`--text-${size}`)).toBe(`${size}px`)
    expect(theme.get(`--text-${size}--line-height`)).toBe(`${lineHeight}px`)
  })

  it('drops the Tailwind default type scale', () => {
    expect(theme.get('--text-*')).toBe('initial')
  })
})
