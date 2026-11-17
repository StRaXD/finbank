import { describe, expect, it } from 'vitest'
import { BUTTON_HOVER_GATE, buttonClassName, type ButtonVariant } from './buttonStyles.ts'

const variants: ButtonVariant[] = ['primary', 'outline', 'text', 'google']
const classes = (className: string) => className.split(' ')

describe('buttonClassName', () => {
  it.each(variants)('gates the %s button hover on enabled and not aria-disabled', (variant) => {
    const list = classes(buttonClassName({ variant }))
    expect(BUTTON_HOVER_GATE).toBe('enabled:not-aria-disabled:hover:')
    expect(list.filter((c) => c.includes('hover:'))).toHaveLength(1)
    expect(list.some((c) => c.startsWith(BUTTON_HOVER_GATE))).toBe(true)
  })

  it.each(variants)('uses an unconditional hover for a %s link', (variant) => {
    const list = classes(buttonClassName({ variant, asLink: true }))
    expect(list.some((c) => c.startsWith('hover:'))).toBe(true)
    expect(list.some((c) => c.startsWith(BUTTON_HOVER_GATE))).toBe(false)
  })

  it.each(variants)('rewrites exactly the %s button hover for links', (variant) => {
    const button = classes(buttonClassName({ variant }))
    const link = classes(buttonClassName({ variant, asLink: true }))
    const gated = button.filter((c) => c.startsWith(BUTTON_HOVER_GATE))
    expect(link.filter((c) => c.startsWith('hover:'))).toEqual(gated.map((c) => `hover:${c.slice(BUTTON_HOVER_GATE.length)}`))
  })
})
