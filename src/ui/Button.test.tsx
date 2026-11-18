import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import googleLogo from '../assets/brands/google.svg'
import { Button, type ButtonVariant } from './Button.tsx'

describe('Button', () => {
  it('defaults to type="button" and allows overriding it', () => {
    render(
      <>
        <Button>Default</Button>
        <Button type="submit">Submit</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit')
  })

  it('calls onClick when enabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Login</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled and shows the grey disabled look', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Login
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Login' })
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:bg-disabled', 'disabled:text-muted', 'disabled:cursor-not-allowed')
  })

  it.each<[ButtonVariant, string[]]>([
    ['primary', ['bg-primary', 'text-white', 'font-bold', 'rounded-button']],
    ['outline', ['border-primary', 'text-primary']],
    ['text', ['text-primary']],
    ['google', ['bg-google', 'text-ink-2']],
  ])('renders the %s variant', (variant, classes) => {
    render(<Button variant={variant}>Action</Button>)
    expect(screen.getByRole('button', { name: 'Action' })).toHaveClass(...classes)
  })

  it('gives the text variant no padding box', () => {
    render(<Button variant="text">Create an account</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).not.toMatch(/\bpx-|\bh-\d/)
  })

  it('shows the Google logo only on the google variant, hidden from the accessible name', () => {
    render(<Button variant="google">Continue with Google</Button>)
    const button = screen.getByRole('button', { name: 'Continue with Google' })
    expect(screen.getByTestId('google-logo')).toHaveAttribute('src', googleLogo)
    expect(button).toContainElement(screen.getByTestId('google-logo'))
  })

  it('omits the Google logo on other variants', () => {
    render(<Button>Login</Button>)
    expect(screen.queryByTestId('google-logo')).toBeNull()
  })

  it('supports fullWidth and the sm size', () => {
    render(
      <>
        <Button fullWidth>Wide</Button>
        <Button size="sm">Small</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Wide' })).toHaveClass('w-full')
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('h-8', 'text-12')
    expect(screen.getByRole('button', { name: 'Small' })).not.toHaveClass('w-full')
  })

  it('supports the compact size (36px, 14px text, 16px icon) of the card actions', () => {
    render(
      <Button variant="outline" size="compact" trailingIcon="pencil">
        Adjust Goal
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Adjust Goal' })
    expect(button).toHaveClass('h-9', 'px-5', 'gap-2', 'text-14', 'border-primary')
    expect(button.querySelector('[data-icon="pencil"]')).toHaveAttribute('width', '16')
  })

  it('renders leading and trailing icons from the icon map', () => {
    const { container } = render(
      <>
        <Button variant="outline" trailingIcon="pencil">
          Adjust
        </Button>
        <Button size="sm" leadingIcon="check" trailingIcon="chevronRight">
          Details
        </Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Adjust' })).toBeInTheDocument()
    expect(container.querySelector('[data-icon="pencil"]')).toHaveAttribute('aria-hidden', 'true')
    const details = screen.getByRole('button', { name: 'Details' })
    const icons = [...details.querySelectorAll('[data-icon]')].map((el) => el.getAttribute('data-icon'))
    expect(icons).toEqual(['check', 'chevronRight'])
  })

  it('is focusable, and not when disabled', () => {
    render(
      <>
        <Button>Focus me</Button>
        <Button disabled>No focus</Button>
      </>,
    )
    const enabled = screen.getByRole('button', { name: 'Focus me' })
    enabled.focus()
    expect(enabled).toHaveFocus()
    const disabled = screen.getByRole('button', { name: 'No focus' })
    disabled.focus()
    expect(disabled).not.toHaveFocus()
  })

  it('passes native attributes through', () => {
    render(
      <Button aria-describedby="hint" form="login-form" name="go">
        Go
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button).toHaveAttribute('aria-describedby', 'hint')
    expect(button).toHaveAttribute('form', 'login-form')
    expect(button).toHaveAttribute('name', 'go')
  })
})
