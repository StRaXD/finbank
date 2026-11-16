// @vitest-environment node
// Builds the app with Vite and checks the emitted CSS: the token, base-style and Inter wiring
// (tokens.css import, @fontsource-variable/inter import) that unit tests cannot see.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const repoRoot = resolve(import.meta.dirname, '..', '..')

let outDir: string
let css = ''
let assets: string[] = []

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'finbank-build-'))
  await build({
    root: repoRoot,
    configFile: join(repoRoot, 'vite.config.ts'),
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
  })
  assets = readdirSync(join(outDir, 'assets'))
  css = assets
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(outDir, 'assets', f), 'utf8'))
    .join('\n')
}, 120_000)

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true })
})

// Declarations of the first rule whose selector list is exactly `selector`.
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|[}{;\\s])${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  return match?.[1] ?? ''
}

describe('built CSS', () => {
  it('emits CSS', () => {
    expect(css.length).toBeGreaterThan(0)
  })

  it.each(['primary', 'ink', 'ink-2', 'muted', 'subtle', 'faint', 'border', 'surface', 'danger', 'positive'])(
    'always emits the chart colour --color-%s',
    (name) => {
      expect(css).toMatch(new RegExp(`--color-${name}:`))
    },
  )

  it('emits no Tailwind default palette colours', () => {
    expect(css).not.toMatch(/--color-(?:red|blue|gray|slate|emerald|teal)-\d+:/)
  })

  it('emits base colours that derived tokens reference', () => {
    expect(css).toMatch(/--color-white:/)
  })

  it('sets the body font, page background and ink colour', () => {
    const body = ruleBody('body')
    expect(body).toContain('font-family:var(--font-sans)')
    expect(body).toContain('background-color:var(--color-surface)')
    expect(body).toContain('color:var(--color-ink)')
  })

  it('draws a focus ring from the focus-ring token', () => {
    const focus = ruleBody(':focus-visible')
    expect(focus).toMatch(/outline:var\(--focus-ring-width\) solid var\(--color-focus-ring\)/)
    expect(focus).toContain('outline-offset:var(--focus-ring-offset)')
  })

  it.each([
    ['.bg-google', 'background-color:var(--color-google)'],
    ['.bg-disabled', 'background-color:var(--color-disabled)'],
    ['.rounded-button', 'border-radius:var(--radius-button)'],
    ['.rounded-input', 'border-radius:var(--radius-input)'],
    ['.rounded-checkbox', 'border-radius:var(--radius-checkbox)'],
  ])('emits %s backed by its token', (selector, declaration) => {
    expect(ruleBody(selector)).toContain(declaration)
  })

  it('self-hosts Inter Variable', () => {
    expect(css).toMatch(/@font-face\{[^}]*font-family:\s*["']?Inter Variable["']?[^}]*\.woff2/)
    expect(assets.some((f) => /^inter-.*\.woff2$/.test(f))).toBe(true)
  })
})
