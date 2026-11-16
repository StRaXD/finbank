// @vitest-environment node
// AD-11: colour and font-size values live only in src/styles/tokens.css.
// Fails on hex literals and arbitrary colour / font-size utilities anywhere else in src/.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const srcRoot = resolve(import.meta.dirname)
const tokensFile = join(srcRoot, 'styles', 'tokens.css')

const HEX = /#[0-9a-fA-F]{3,8}\b/g
// Functional colour literals: the colour function name followed by an opening paren.
const COLOR_FN = /(?<![\w-])(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/gi
// Arbitrary values on colour-bearing, font or type-size utilities: `bg-` / `text-` / `leading-` etc.
// followed by a square-bracket or paren value. Compound prefixes are listed explicitly because the
// lookbehind rejects a match that starts mid-word.
const ARBITRARY =
  /(?<![\w-])(?:text-shadow|inset-shadow|drop-shadow|ring-offset|text|bg|border(?:-[xytrblse])?|ring|outline|fill|stroke|from|via|to|decoration|divide|placeholder|accent|caret|shadow|leading|tracking|font)-[[(][^\])\s]*[\])]/g
// Tailwind arbitrary properties that set colour, font or type size: square bracket, property, colon.
const ARBITRARY_PROPERTY =
  /\[(?:[\w-]*color|background[\w-]*|fill[\w-]*|stroke[\w-]*|font[\w-]*|line-height|letter-spacing):[^\]]*\]/gi

function findLiterals(source: string): { line: number; match: string }[] {
  const hits: { line: number; match: string }[] = []
  source.split(/\r?\n/).forEach((text, i) => {
    for (const re of [HEX, COLOR_FN, ARBITRARY, ARBITRARY_PROPERTY]) {
      for (const m of text.matchAll(re)) hits.push({ line: i + 1, match: m[0] })
    }
  })
  return hits
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.(ts|tsx|css)$/.test(entry.name) ? [full] : []
  })
}

describe('design literal ban', () => {
  it('catches the forbidden patterns (self-check)', () => {
    // Built by concatenation so this file does not trip its own scan.
    const hash = '#'
    const open = '['
    const samples = [
      `color: ${hash}299D91;`,
      `className="bg-${open}${hash}fff]"`,
      `className="text-${open}${hash}191919]"`,
      `className="text-${open}13px]"`,
      `className="border-${open}var(--x)]"`,
      `className="ring-${'('}--brand)"`,
      `className="leading-${open}17px]"`,
      `className="tracking-${open}0.1em]"`,
      `className="font-${open}650]"`,
      `className="text-shadow-${open}0_0_2px_black]"`,
      `className="${open}color:red]"`,
      `className="${open}font-size:13px]"`,
      `className="${open}background-color:var(--x)]"`,
      `className="${open}fill:currentColor]"`,
      `className="${open}stroke-width:2]"`,
      ...['rgb', 'rgba', 'hsl', 'hsla', 'oklch', 'oklab', 'lab', 'lch'].map((f) => `color: ${f}(0 0 0);`),
    ]
    for (const s of samples) expect(findLiterals(s), s).not.toHaveLength(0)
    for (const ok of [
      'className="text-14 bg-primary grid-cols-[8rem_1fr]"',
      'href="#main"',
      'const collab = collab(x)',
    ]) {
      expect(findLiterals(ok), ok).toHaveLength(0)
    }
  })

  it('finds no literals outside tokens.css', () => {
    const offenders = walk(srcRoot)
      .filter((file) => file !== tokensFile)
      .flatMap((file) =>
        findLiterals(readFileSync(file, 'utf8')).map(
          ({ line, match }) => `${relative(srcRoot, file).split(sep).join('/')}:${line}: ${match}`,
        ),
      )
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
