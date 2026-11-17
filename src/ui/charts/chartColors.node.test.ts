// @vitest-environment node
// Every chart colour variable must be declared, non-empty, in tokens.css's `@theme static` block,
// so Tailwind always emits it and `readChartColors` never reads an empty value.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { chartColorVars } from './chartColorVars.ts'

const css = readFileSync(resolve(import.meta.dirname, '../../styles/tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)
const staticBody = /@theme\s+static\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
const staticDecls = new Map(
  [...staticBody.matchAll(/(--[\w-]+)\s*:\s*([^;]*);/g)].map(([, name, value]) => [name, value.trim()]),
)

describe('chartColorVars', () => {
  it('finds the static block', () => {
    expect(staticBody).not.toBe('')
  })

  it.each(Object.entries(chartColorVars))('%s (%s) is declared non-empty under @theme static', (_role, name) => {
    expect(staticDecls.get(name)).toBeTruthy()
  })
})
