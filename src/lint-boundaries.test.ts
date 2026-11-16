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
    ['app composes the mock adapter', 'src/app/providers.ts', valueImport('../api/mock/mockApi')],
    ['feature uses api hooks', 'src/features/auth/E.ts', valueImport('../../api/hooks/useToday')],
    ['api uses its own mock', 'src/api/D.ts', valueImport('./mock/seed')],
  ])('passes when %s', (_name, relPath, source) => {
    expectPasses(lintProbe(relPath, source))
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
