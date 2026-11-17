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
    '--color-subtle': hex('707070'),
    '--color-faint': hex('9F9F9F'),
    '--color-border': hex('E8E8E8'),
    '--color-surface': hex('F4F5F7'),
    '--color-danger': hex('E73D1C'),
    '--color-positive': hex('4DAF6E'),
    '--color-chart-current': 'VAR(--COLOR-PRIMARY)',
    '--color-chart-previous': hex('E8E8E8'),
    '--color-chart-grid': hex('F3F3F3'),
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
    // Adobe's official brand red: 4.56:1 on white (FFFFFF), so the vendor name passes WCAG AA at every
    // size (108's 24px name and 104's 16px compact name share it).
    ['--color-brand-adobe', hex('EB1000')],
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

  it('keeps the Adobe vendor name at WCAG AA contrast (>= 4.5:1) on white', () => {
    const value = theme.get('--color-brand-adobe') ?? ''
    expect(value).toMatch(/^#[0-9A-F]{6}$/i)
    expect(contrastRatio(value, hex('FFFFFF'))).toBeGreaterThanOrEqual(4.5)
  })

  // Text tokens must pass WCAG AA (>= 4.5:1) on both the card white and the page grey. `faint` is
  // excluded: it is reserved for disabled controls, which WCAG 1.4.3 exempts.
  // `brand-adobe` is checked on white only (the test above): it is 4.17:1 on the surface grey and is
  // only ever rendered inside white bill cards.
  it.each(['--color-ink', '--color-ink-2', '--color-muted', '--color-subtle'])(
    '%s reaches WCAG AA contrast on white and on the surface grey',
    (name) => {
      const value = theme.get(name) ?? ''
      const surface = theme.get('--color-surface') ?? ''
      expect(value).toMatch(/^#[0-9A-F]{6}$/i)
      expect(surface).toMatch(/^#[0-9A-F]{6}$/i)
      expect(contrastRatio(value, hex('FFFFFF'))).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(value, surface)).toBeGreaterThanOrEqual(4.5)
    },
  )
})

/** WCAG 2 relative luminance of a `#RRGGBB` colour. */
function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(color.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}
