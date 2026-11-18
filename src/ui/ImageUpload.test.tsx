import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageUpload } from './ImageUpload.tsx'

const input = () => screen.getByTestId('image-upload-input') as HTMLInputElement

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ImageUpload', () => {
  it('shows the empty prompt: the label, an image-plus icon and "Upload your photo"', () => {
    render(<ImageUpload label="Your Profile Picture" onSelect={() => {}} />)
    expect(screen.getByRole('group', { name: 'Your Profile Picture' })).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Upload your photo' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    expect(button.querySelector('[data-icon="imagePlus"]')).toBeInTheDocument()
    expect(button).toHaveTextContent('Upload your photo')
    expect(button.querySelector('img')).not.toBeInTheDocument()
    expect(button.querySelector('rect')).toHaveClass('stroke-faint')
  })

  it('shows the image as a preview and is named "Change your photo"', () => {
    render(<ImageUpload label="Your Profile Picture" imageUrl="blob:preview" onSelect={() => {}} />)
    const button = screen.getByRole('button', { name: 'Change your photo' })
    expect(button.querySelector('img')).toHaveAttribute('src', 'blob:preview')
    expect(button).not.toHaveTextContent('Upload your photo')
  })

  it('opens the hidden file input when the button is activated', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    render(<ImageUpload label="Photo" accept="image/png,image/jpeg" onSelect={() => {}} />)
    expect(input()).toHaveAttribute('type', 'file')
    expect(input()).toHaveAttribute('accept', 'image/png,image/jpeg')
    expect(input()).toHaveAttribute('tabindex', '-1')
    expect(input()).toHaveClass('hidden')
    fireEvent.click(screen.getByRole('button', { name: 'Upload your photo' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(click.mock.contexts[0]).toBe(input())
  })

  it('is keyboard reachable (a native button handles Enter and Space)', () => {
    render(<ImageUpload label="Photo" onSelect={() => {}} />)
    const button = screen.getByRole('button', { name: 'Upload your photo' })
    button.focus()
    expect(button).toHaveFocus()
    expect(button).not.toHaveAttribute('tabindex')
  })

  it('calls onSelect with the picked file and clears the input so the same file can be picked again', () => {
    const onSelect = vi.fn()
    render(<ImageUpload label="Photo" onSelect={onSelect} />)
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input(), { target: { files: [file] } })
    expect(onSelect).toHaveBeenCalledWith(file)
    expect(input().value).toBe('')
  })

  it('ignores a cancelled pick', () => {
    const onSelect = vi.fn()
    render(<ImageUpload label="Photo" onSelect={onSelect} />)
    fireEvent.change(input(), { target: { files: [] } })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows an error under the box and describes the button with it', () => {
    render(<ImageUpload label="Photo" imageUrl="blob:old" error="Choose an image under 5 MB." onSelect={() => {}} />)
    const error = screen.getByText('Choose an image under 5 MB.')
    expect(error).toHaveClass('text-danger')
    const button = screen.getByRole('button', { name: 'Change your photo' })
    expect(button).toHaveAccessibleDescription('Choose an image under 5 MB.')
    expect(button.querySelector('rect')).toHaveClass('stroke-danger')
  })

  it('has no description without an error', () => {
    render(<ImageUpload label="Photo" onSelect={() => {}} />)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby')
  })
})
