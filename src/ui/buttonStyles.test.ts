import { describe, expect, it } from 'vitest'
import { buttonClassName, type ButtonVariant } from './buttonStyles.ts'

const variants: ButtonVariant[] = ['primary', 'outline', 'text', 'google']
const classes = (className: string) => className.split(' ')

describe('buttonClassName', () => {
  it.each(variants)('keeps the enabled-gated hover for a %s button', (variant) => {
    const list = classes(buttonClassName({ variant }))
    expect(list.some((c) => c.startsWith('enabled:hover:'))).toBe(true)
  })

  it.each(variants)('uses an unconditional hover for a %s link', (variant) => {
    const list = classes(buttonClassName({ variant, asLink: true }))
    expect(list.some((c) => c.startsWith('hover:'))).toBe(true)
    expect(list.some((c) => c.startsWith('enabled:hover:'))).toBe(false)
  })

  it.each(variants)('rewrites exactly the %s button hover for links', (variant) => {
    const button = classes(buttonClassName({ variant }))
    const link = classes(buttonClassName({ variant, asLink: true }))
    const gated = button.filter((c) => c.startsWith('enabled:hover:'))
    expect(link.filter((c) => c.startsWith('hover:'))).toEqual(gated.map((c) => c.slice('enabled:'.length)))
  })
})
