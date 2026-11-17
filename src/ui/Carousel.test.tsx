import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Carousel } from './Carousel.tsx'

type Item = { id: string; name: string }

const make = (count: number): Item[] => Array.from({ length: count }, (_, i) => ({ id: `i${i + 1}`, name: `Item ${i + 1}` }))

function renderCarousel(items: Item[]) {
  const ui = (list: Item[]) => (
    <Carousel label="Accounts" items={list} getKey={(item) => item.id} renderItem={(item) => <p>{item.name}</p>} />
  )
  const view = render(ui(items))
  return { ...view, setItems: (list: Item[]) => view.rerender(ui(list)) }
}

const region = () => screen.getByRole('region', { name: 'Accounts' })
const slide = () => within(region()).getByRole('group')
const prev = () => screen.getByRole('button', { name: 'Previous' })
const next = () => screen.getByRole('button', { name: 'Next' })
const dots = () => screen.getAllByRole('button', { name: /^Show slide/ })
const activeDot = () => dots().findIndex((dot) => dot.getAttribute('aria-current') === 'true')

describe('Carousel', () => {
  it('shows the first slide with the carousel and slide semantics', () => {
    renderCarousel(make(3))
    expect(region()).toHaveAttribute('aria-roledescription', 'carousel')
    expect(slide()).toHaveAttribute('aria-roledescription', 'slide')
    expect(slide()).toHaveAttribute('aria-label', '1 of 3')
    expect(slide()).toHaveTextContent('Item 1')
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument()
    expect(dots().map((d) => d.getAttribute('aria-label'))).toEqual([
      'Show slide 1 of 3',
      'Show slide 2 of 3',
      'Show slide 3 of 3',
    ])
    expect(activeDot()).toBe(0)
    expect(dots()[0]).toHaveClass('bg-primary')
    expect(dots()[1]).not.toHaveClass('bg-primary')
    expect(dots()[1]).not.toHaveAttribute('aria-current')
    expect(prev()).toBeDisabled()
    expect(next()).toBeEnabled()
    expect(prev().querySelector('[data-icon="chevronLeft"]')).not.toBeNull()
    expect(next().querySelector('[data-icon="chevronRight"]')).not.toBeNull()
  })

  it('moves with Next and Previous, disabling each at its end', () => {
    renderCarousel(make(3))
    fireEvent.click(next())
    expect(slide()).toHaveTextContent('Item 2')
    expect(activeDot()).toBe(1)
    expect(prev()).toBeEnabled()
    fireEvent.click(next())
    expect(slide()).toHaveAttribute('aria-label', '3 of 3')
    expect(next()).toBeDisabled()
    fireEvent.click(prev())
    expect(slide()).toHaveTextContent('Item 2')
    expect(next()).toBeEnabled()
  })

  it('hands focus to Previous when Next reaches the end', () => {
    renderCarousel(make(2))
    next().focus()
    fireEvent.click(next())
    expect(next()).toBeDisabled()
    expect(prev()).toHaveFocus()
    fireEvent.click(prev())
    expect(next()).toHaveFocus()
  })

  it('jumps to a slide from its dot', () => {
    renderCarousel(make(4))
    fireEvent.click(dots()[2]!)
    expect(slide()).toHaveTextContent('Item 3')
    expect(activeDot()).toBe(2)
  })

  it('moves with the arrow keys while focus is inside, stopping at the ends', () => {
    renderCarousel(make(3))
    dots()[0]!.focus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(slide()).toHaveTextContent('Item 1')
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(slide()).toHaveTextContent('Item 2')
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(slide()).toHaveTextContent('Item 3')
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(slide()).toHaveTextContent('Item 2')
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    expect(slide()).toHaveTextContent('Item 2')
  })

  it('ignores arrow keys with a modifier held, leaving them to the browser', () => {
    renderCarousel(make(3))
    dots()[0]!.focus()
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
      const notPrevented = fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight', [modifier]: true })
      expect(notPrevented, modifier).toBe(true)
      expect(slide()).toHaveTextContent('Item 1')
    }
    expect(fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })).toBe(false)
    expect(slide()).toHaveTextContent('Item 2')
  })

  it('handles a single item: one dot, both controls disabled, arrow keys do nothing', () => {
    renderCarousel(make(1))
    expect(dots()).toHaveLength(1)
    expect(dots()[0]).toHaveAttribute('aria-current', 'true')
    expect(prev()).toBeDisabled()
    expect(next()).toBeDisabled()
    expect(slide()).toHaveAttribute('aria-label', '1 of 1')
    dots()[0]!.focus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(slide()).toHaveTextContent('Item 1')
    expect(slide()).toHaveAttribute('aria-label', '1 of 1')
  })

  it('clamps the index to the last item when the list shrinks, and stays there when it grows', () => {
    const { setItems } = renderCarousel(make(5))
    fireEvent.click(dots()[4]!)
    expect(slide()).toHaveAttribute('aria-label', '5 of 5')
    setItems(make(4))
    expect(slide()).toHaveAttribute('aria-label', '4 of 4')
    expect(slide()).toHaveTextContent('Item 4')
    expect(dots()).toHaveLength(4)
    expect(next()).toBeDisabled()
    setItems(make(5))
    expect(slide()).toHaveAttribute('aria-label', '4 of 5')
  })

  it('renders nothing for an empty list', () => {
    const { container } = renderCarousel([])
    expect(container).toBeEmptyDOMElement()
  })
})
