// @vitest-environment node
// `faint` fails WCAG AA text contrast, so it may colour text only in disabled states (which WCAG
// 1.4.3 exempts). Readable grey text uses `subtle`. Fails on any `text-faint` / `placeholder:text-faint`
// utility without a `disabled:` or `aria-disabled:` variant in src/ (tests excluded).
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const srcRoot = resolve(import.meta.dirname)

// A whole utility token ending in `text-faint` (optionally with an opacity suffix), variants included.
const FAINT_TEXT = /(?<![\w:-])((?:[\w-]+:)*)text-faint(?:\/\d+)?(?![\w-])/g

function findFaintText(source: string): { line: number; match: string }[] {
  const hits: { line: number; match: string }[] = []
  source.split(/\r?\n/).forEach((text, i) => {
    for (const m of text.matchAll(FAINT_TEXT)) {
      const variants = m[1]!.split(':').filter(Boolean)
      if (!variants.some((v) => v === 'disabled' || v === 'aria-disabled')) hits.push({ line: i + 1, match: m[0] })
    }
  })
  return hits
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

describe('faint text ban', () => {
  it('catches enabled faint text and allows disabled faint (self-check)', () => {
    // Built by concatenation so a future scan of tests would not trip on this file.
    const faint = 'text-' + 'faint'
    for (const bad of [
      `className="text-14 ${faint}"`,
      `className="placeholder:${faint}"`,
      `className="hover:${faint}"`,
      `'${faint}'`,
    ]) {
      expect(findFaintText(bad), bad).not.toHaveLength(0)
    }
    for (const ok of [
      `className="disabled:${faint}"`,
      `className="aria-disabled:${faint}"`,
      `className="enabled:hover:text-primary disabled:${faint}"`,
      'className="bg-faint border-faint text-subtle"',
    ]) {
      expect(findFaintText(ok), ok).toHaveLength(0)
    }
  })

  it('finds no faint text outside disabled states', () => {
    const offenders = walk(srcRoot).flatMap((file) =>
      findFaintText(readFileSync(file, 'utf8')).map(
        ({ line, match }) => `${relative(srcRoot, file).split(sep).join('/')}:${line}: ${match}`,
      ),
    )
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
