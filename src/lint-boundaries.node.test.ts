// @vitest-environment node
// Regression test for the AD-1 layering rules and hook/cycle rules in .oxlintrc.json.
//
// Deliberate-violation probes are written into a temp folder (outside the
// normal lint and type-check scope) next to a copy of the real config, so the
// override `files` globs (`src/ui/**`, ...) resolve exactly as in the repo.
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const repoRoot = resolve(import.meta.dirname, '..')
const oxlintBin = join(repoRoot, 'node_modules', 'oxlint', 'bin', 'oxlint')

let probeRoot: string | undefined

function writeProbe(relPath: string, source: string) {
  const file = join(probeRoot!, relPath)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, source)
}

function lint(...relPaths: string[]) {
  const result = spawnSync(
    process.execPath,
    [oxlintBin, '-c', '.oxlintrc.json', '--deny-warnings', ...relPaths],
    { cwd: probeRoot, encoding: 'utf8', timeout: 30000 },
  )
  expect(result.error).toBeUndefined()
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

function lintProbe(relPath: string, source: string) {
  writeProbe(relPath, source)
  return lint(relPath)
}

function expectFails(r: { status: number | null; output: string }, rule: string) {
  expect(r.status).toBe(1)
  expect(r.output).toContain(rule)
}

function expectPasses(r: { status: number | null; output: string }) {
  expect(r.output).not.toContain('no-restricted-imports')
  expect(r.status).toBe(0)
}

beforeAll(() => {
  probeRoot = mkdtempSync(join(tmpdir(), 'finbank-lint-probes-'))
  copyFileSync(join(repoRoot, '.oxlintrc.json'), join(probeRoot, '.oxlintrc.json'))
})

afterAll(() => {
  if (probeRoot) rmSync(probeRoot, { recursive: true, force: true })
})

const valueImport = (from: string) => `import { x } from '${from}'\nexport const y = x\n`
const typeImport = (from: string) => `import type { x } from '${from}'\nexport type Y = x\n`

describe('AD-1 import boundaries', () => {
  it.each([
    ['ui imports features', 'src/ui/A.ts', valueImport('../features/auth')],
    ['ui imports app', 'src/ui/B.ts', valueImport('../app/x')],
    ['ui imports a value from api/types', 'src/ui/C.ts', valueImport('../api/types')],
    ['ui imports a value from api/types.ts', 'src/ui/TypesValue.ts', valueImport('../api/types.ts')],
    ['ui imports other api modules', 'src/ui/D.ts', typeImport('../api/port')],
    ['feature imports api/mock', 'src/features/auth/A.ts', valueImport('../../api/mock/seed')],
    ['feature imports api/mock.ts', 'src/features/auth/B.ts', valueImport('../../api/mock.ts')],
    ['feature imports api/http', 'src/features/auth/C.ts', valueImport('../../api/http/httpApi')],
    ['feature imports app', 'src/features/auth/D.ts', valueImport('../../app/x')],
    ['lib imports ui', 'src/lib/A.ts', valueImport('../ui/Button')],
    ['lib imports api/mock', 'src/lib/B.ts', valueImport('../api/mock/seed')],
    ['lib imports features', 'src/lib/C.ts', valueImport('../features/x')],
    ['lib imports app', 'src/lib/D.ts', valueImport('../app/x')],
    ['api imports features', 'src/api/A.ts', valueImport('../features/auth')],
    ['api imports ui', 'src/api/B.ts', valueImport('../ui/x')],
    ['api imports app', 'src/api/C.ts', valueImport('../app/x')],
  ])('fails when %s', (_name, relPath, source) => {
    expectFails(lintProbe(relPath, source), 'no-restricted-imports')
  })

  it.each([
    ['ui uses `import type` from api/types', 'src/ui/E.ts', typeImport('../api/types')],
    ['ui uses `import type` from api/types.ts', 'src/ui/TypesType.ts', typeImport('../api/types.ts')],
    ['app composes the mock adapter', 'src/app/providers.ts', valueImport('../api/mock/mockApi')],
    ['feature uses api hooks', 'src/features/auth/E.ts', valueImport('../../api/hooks/useToday')],
    ['api uses its own mock', 'src/api/D.ts', valueImport('./mock/seed')],
  ])('passes when %s', (_name, relPath, source) => {
    expectPasses(lintProbe(relPath, source))
  })
})

describe('AD-9/AD-10 date, Intl and toFixed ban', () => {
  const nowCall = 'export const now = new Date()\n'
  const dateArgs = "export const d = new Date('2023-05-19')\n"
  const dateParse = "export const t = Date.parse('2023-05-19')\n"
  const dateNow = 'export const t = Date.now()\n'
  const intlNumber = "export const f = new Intl.NumberFormat('en-US')\n"
  const intlDate = 'export const f = Intl.DateTimeFormat\n'
  const toFixed = 'export const s = (1.5).toFixed(2)\n'
  const viaGlobalThis = 'export const D = globalThis.Date\n'
  const viaWindow = 'export const I = window.Intl\n'
  const viaSelfDate = 'export const D = self.Date\n'
  const viaSelfIntl = 'export const I = self.Intl\n'
  const localeString = "export const ls = (1234).toLocaleString('en-US')\n"
  const localeDate = 'export const fd = (d: { toLocaleDateString(): string }) => d.toLocaleDateString()\n'
  const localeTime = 'export const ft = (d: { toLocaleTimeString(): string }) => d.toLocaleTimeString()\n'

  it.each([
    ['a feature calls new Date()', 'src/features/x/A.ts', nowCall, 'no-restricted-globals'],
    ['a feature builds a Date from a string', 'src/features/x/B.ts', dateArgs, 'no-restricted-globals'],
    ['a feature calls Date.parse', 'src/features/x/C.ts', dateParse, 'no-restricted-globals'],
    ['a feature calls Date.now', 'src/features/x/D.ts', dateNow, 'no-restricted-globals'],
    ['a feature uses Intl.NumberFormat', 'src/features/x/E.ts', intlNumber, 'no-restricted-globals'],
    ['ui uses Intl.DateTimeFormat', 'src/ui/F.ts', intlDate, 'no-restricted-globals'],
    ['ui calls toFixed', 'src/ui/G.ts', toFixed, 'no-restricted-properties'],
    ['api uses new Date()', 'src/api/H.ts', nowCall, 'no-restricted-globals'],
    ['app uses toFixed', 'src/app/I.ts', toFixed, 'no-restricted-properties'],
    ['another lib module uses new Date()', 'src/lib/money.ts', nowCall, 'no-restricted-globals'],
    ['a lib test uses Intl', 'src/lib/format.test.ts', intlNumber, 'no-restricted-globals'],
    ['a feature reaches Date via globalThis', 'src/features/x/J.ts', viaGlobalThis, 'no-restricted-properties'],
    ['a feature reaches Intl via window', 'src/features/x/K.ts', viaWindow, 'no-restricted-properties'],
    ['a feature reaches Date via self', 'src/features/x/M.ts', viaSelfDate, 'no-restricted-properties'],
    ['a feature reaches Intl via self', 'src/features/x/N.ts', viaSelfIntl, 'no-restricted-properties'],
    ['ui calls toLocaleString', 'src/ui/O.ts', localeString, 'no-restricted-properties'],
    ['a feature calls toLocaleDateString', 'src/features/x/P.ts', localeDate, 'no-restricted-properties'],
    ['a feature calls toLocaleTimeString', 'src/features/x/Q.ts', localeTime, 'no-restricted-properties'],
  ])('fails when %s', (_name, relPath, source, rule) => {
    expectFails(lintProbe(relPath, source), rule)
  })

  it.each([
    ['lib/dates.ts', 'src/lib/dates.ts', dateArgs + dateParse + nowCall],
    ['lib/format.ts', 'src/lib/format.ts', intlNumber + toFixed + localeString + localeDate],
  ])('passes in %s', (_name, relPath, source) => {
    const r = lintProbe(relPath, source)
    expect(r.output).not.toContain('no-restricted-')
    expect(r.status).toBe(0)
  })

  it('allows Date as a type outside lib', () => {
    const r = lintProbe(
      'src/features/x/L.ts',
      'export function f(d: Date): Date {\n  return d\n}\n',
    )
    expect(r.output).not.toContain('no-restricted-')
    expect(r.status).toBe(0)
  })
})

describe('hook and cycle rules', () => {
  it('fails on an import cycle', () => {
    writeProbe('src/lib/cycle/a.ts', "import { b } from './b'\nexport const a = () => b\n")
    writeProbe('src/lib/cycle/b.ts', "import { a } from './a'\nexport const b = () => a\n")
    expectFails(lint('src/lib/cycle'), 'no-cycle')
  })

  it('fails on a missing effect dependency', () => {
    const r = lintProbe(
      'src/features/hooks/Title.tsx',
      [
        "import { useEffect } from 'react'",
        'export function Title({ text }: { text: string }) {',
        '  useEffect(() => {',
        '    document.title = text',
        '  }, [])',
        '  return null',
        '}',
        '',
      ].join('\n'),
    )
    expectFails(r, 'exhaustive-deps')
  })
})
