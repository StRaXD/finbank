import { afterEach, describe, expect, it } from 'vitest'
import { chartColorVars, readChartColors } from './chartColors.ts'

const root = document.documentElement

afterEach(() => {
  for (const name of Object.values(chartColorVars)) root.style.removeProperty(name)
})

describe('readChartColors', () => {
  it('reads every role back from its CSS variable, trimmed', () => {
    root.style.setProperty(chartColorVars.current, ' teal ')
    root.style.setProperty(chartColorVars.previous, 'silver')
    root.style.setProperty(chartColorVars.grid, 'gainsboro')
    expect(readChartColors()).toEqual({ current: 'teal', previous: 'silver', grid: 'gainsboro' })
  })

  it('reads from a given element', () => {
    const el = document.createElement('div')
    document.body.append(el)
    el.style.setProperty(chartColorVars.grid, 'white')
    expect(readChartColors(el).grid).toBe('white')
    el.remove()
  })

  it('maps the roles to the token names', () => {
    expect(chartColorVars).toEqual({
      current: '--color-chart-current',
      previous: '--color-chart-previous',
      grid: '--color-chart-grid',
    })
  })
})
