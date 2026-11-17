import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OverlayHostContext, useInertCount, useOverlayHost } from './overlayHost.ts'

describe('useOverlayHost', () => {
  it('returns a no-op host outside a provider', () => {
    const { result } = renderHook(() => useOverlayHost())
    expect(result.current.container).toBeNull()
    const release = result.current.acquireInert()
    expect(typeof release).toBe('function')
    expect(() => release()).not.toThrow()
  })

  it('returns the provided host', () => {
    const container = document.createElement('div')
    const host = { container, acquireInert: () => () => {} }
    function Probe() {
      return <p>{useOverlayHost().container === container ? 'provided' : 'default'}</p>
    }
    render(
      <OverlayHostContext value={host}>
        <Probe />
      </OverlayHostContext>,
    )
    expect(screen.getByText('provided')).toBeInTheDocument()
  })
})

describe('useInertCount', () => {
  it('stays inert until every acquisition is released', () => {
    const { result } = renderHook(() => useInertCount())
    expect(result.current.inert).toBe(false)
    let a = () => {}
    let b = () => {}
    act(() => {
      a = result.current.acquireInert()
      b = result.current.acquireInert()
    })
    expect(result.current.inert).toBe(true)
    act(() => a())
    expect(result.current.inert).toBe(true)
    act(() => b())
    expect(result.current.inert).toBe(false)
  })

  it('counts a repeated release only once', () => {
    const { result } = renderHook(() => useInertCount())
    let a = () => {}
    act(() => {
      a = result.current.acquireInert()
      result.current.acquireInert()
    })
    act(() => {
      a()
      a()
    })
    expect(result.current.inert).toBe(true)
  })

  it('keeps acquireInert stable across renders', () => {
    const { result, rerender } = renderHook(() => useInertCount())
    const first = result.current.acquireInert
    rerender()
    expect(result.current.acquireInert).toBe(first)
  })
})
