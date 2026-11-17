import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// AD-9: the date and format helpers must give the same calendar day in every time zone.
// The lib tests run once per zone below, in addition to the main run under the host zone.
// Santiago skips local midnight at its DST start (2023-09-03); Kolkata has a half-hour offset.
const TZ_MATRIX = [
  'UTC',
  'America/Los_Angeles',
  'Pacific/Kiritimati',
  'America/Santiago',
  'Asia/Kolkata',
]

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            setupFiles: ['./src/test-setup.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
          },
        },
        ...TZ_MATRIX.map((tz) => ({
          extends: true,
          test: {
            name: `tz:${tz}`,
            environment: 'node',
            include: ['src/lib/**/*.test.ts'],
            env: { TZ: tz, FINBANK_TZ_MATRIX: tz },
          },
        })),
      ],
    },
  }),
)
