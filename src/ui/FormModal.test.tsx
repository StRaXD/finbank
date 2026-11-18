import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { FormModal, FormModalForm, type SaveHandlers } from './FormModal.tsx'
import { TextInput } from './TextInput.tsx'

type Values = { name: string }

type SaveImpl = (values: Values, handlers: SaveHandlers & { done: () => void }) => void

function Harness({ save, placement, focusServerErrors }: { save: SaveImpl; placement?: 'default' | 'tall'; focusServerErrors?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const form = useForm<Values>({ defaultValues: { name: 'Ada' } })
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <FormModal open={open} onClose={() => setOpen(false)} label="Edit thing" pending={pending} placement={placement}>
        <FormModalForm
          form={form}
          fieldByApiField={{ apiName: 'name' }}
          pending={pending}
          focusServerErrors={focusServerErrors}
          onSave={(values, handlers) => {
            setPending(true)
            save(values, {
              onError: (error) => {
                setPending(false)
                handlers.onError(error)
                handlers.onSettled()
              },
              onSettled: handlers.onSettled,
              done: () => {
                setPending(false)
                handlers.onSettled()
                setOpen(false)
              },
            })
          }}
        >
          <TextInput label="Name" error={form.formState.errors.name?.message} {...form.register('name', { required: 'Enter a name.' })} />
          <TextInput label="Other" />
        </FormModalForm>
      </FormModal>
    </>
  )
}

const open = () => {
  const opener = screen.getByRole('button', { name: 'Open' })
  opener.focus()
  fireEvent.click(opener)
  return opener
}
const save = () => fireEvent.click(screen.getByRole('button', { name: /Save|Saving/ }))

describe('FormModal', () => {
  it('opens a labelled dialog at the default anchor, with a centred 192px Save', () => {
    render(<Harness save={vi.fn()} />)
    open()
    expect(screen.getByRole('dialog', { name: 'Edit thing' })).toBeInTheDocument()
    expect(screen.getByTestId('modal-overlay')).toHaveClass('pt-69')
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).not.toHaveAttribute('aria-disabled')
    expect(button.parentElement).toHaveClass('w-48')
    expect(button.parentElement?.parentElement).toHaveClass('mt-8', 'flex', 'justify-center')
  })

  it('anchors a tall form higher', () => {
    render(<Harness save={vi.fn()} placement="tall" />)
    open()
    expect(screen.getByTestId('modal-overlay')).toHaveClass('pt-30')
    expect(screen.getByTestId('modal-overlay')).not.toHaveClass('pt-69')
  })

  it('reads "Saving…" on an aria-disabled Save that keeps focus, ignores closes and a second Save, then closes', async () => {
    const calls: Array<SaveHandlers & { done: () => void }> = []
    const impl = vi.fn<SaveImpl>((_values, handlers) => {
      calls.push(handlers)
    })
    render(<Harness save={impl} />)
    const opener = open()
    const button = screen.getByRole('button', { name: 'Save' })
    button.focus()
    save()
    const busy = await screen.findByRole('button', { name: 'Saving…' })
    expect(busy).toHaveAttribute('aria-disabled', 'true')
    expect(busy).toBeEnabled()
    expect(busy).toHaveFocus()
    save()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    const layer = screen.getByTestId('modal-overlay')
    fireEvent.mouseDown(layer)
    fireEvent.click(layer)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl).toHaveBeenCalledWith({ name: 'Ada' }, expect.anything())
    act(() => calls[0]!.done())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })

  it('shows a client error on its field and focuses it, without saving', async () => {
    const impl = vi.fn<SaveImpl>()
    render(<Harness save={impl} />)
    open()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } })
    save()
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(impl).not.toHaveBeenCalled()
  })

  it('maps an adapter field error onto its field, focusing it when asked, and re-arms Save', async () => {
    const impl = vi.fn<SaveImpl>((_values, handlers) => {
      handlers.onError(Object.assign(new Error('Fix it.'), { fieldErrors: { apiName: 'Taken.' } }))
    })
    render(<Harness save={impl} focusServerErrors />)
    open()
    screen.getByRole('button', { name: 'Save' }).focus()
    save()
    expect(await screen.findByText('Taken.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
    save()
    await waitFor(() => expect(impl).toHaveBeenCalledTimes(2))
  })

  it('shows an unmapped failure as one alert and keeps the dialog open', async () => {
    const impl = vi.fn<SaveImpl>((_values, handlers) => {
      handlers.onError(new Error('Your browser storage is full.'))
    })
    render(<Harness save={impl} />)
    open()
    save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-disabled')
  })
})
