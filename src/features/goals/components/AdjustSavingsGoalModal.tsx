import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { useUpdateSavingsGoal } from '../../../api/hooks/useUpdateSavingsGoal.ts'
import { ApiError, type SavingsGoal, type YearMonth } from '../../../api/types.ts'
import { formatMoney } from '../../../lib/format.ts'
import { Button } from '../../../ui/Button.tsx'
import { Modal } from '../../../ui/Modal.tsx'
import { MoneyInput } from '../../../ui/MoneyInput.tsx'
import { savingsGoalSchema, type SavingsGoalFormInput, type SavingsGoalFormValues } from '../schemas.ts'

const genericErrorMessage = 'Something went wrong. Please try again.'

// The adapter's field names, mapped onto this form's inputs.
const fieldByApiField = { targetCents: 'target', achievedCents: 'present' } as const

export type AdjustSavingsGoalModalProps = {
  open: boolean
  onClose: () => void
  /** The month being edited. */
  month: YearMonth
  /** The stored goal of `month`, used to prefill both fields. */
  goal: SavingsGoal
}

type FormProps = Omit<AdjustSavingsGoalModalProps, 'open'> & {
  update: ReturnType<typeof useUpdateSavingsGoal>
}

function AdjustSavingsGoalForm({ month, goal, onClose, update }: FormProps) {
  // Synchronous guard: zod resolves asynchronously, so `isPending` flips too late to stop a
  // quick second Save from calling `mutate` again.
  const inFlight = useRef(false)
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SavingsGoalFormInput, unknown, SavingsGoalFormValues>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      target: formatMoney(goal.targetCents, 'exact'),
      present: formatMoney(goal.achievedCents, 'exact'),
    },
  })

  const showSubmitError = (error: Error) => {
    const unmapped: string[] = []
    let mapped = 0
    if (error instanceof ApiError) {
      for (const [key, raw] of Object.entries(error.fieldErrors ?? {})) {
        const message = typeof raw === 'string' ? raw.trim() : ''
        if (!message) continue
        const field = fieldByApiField[key as keyof typeof fieldByApiField]
        if (field) {
          setError(field, { message })
          mapped++
        } else {
          unmapped.push(message)
        }
      }
    }
    if (unmapped.length > 0) setError('root.server', { message: unmapped.join(' ') })
    else if (mapped === 0) setError('root.server', { message: error.message?.trim() || genericErrorMessage })
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (inFlight.current || update.isPending) {
      event.preventDefault()
      return
    }
    inFlight.current = true
    clearErrors()
    const settle = () => {
      inFlight.current = false
    }
    void handleSubmit(({ target, present }) => {
      update.mutate(
        { month, targetCents: target, achievedCents: present },
        { onSuccess: onClose, onError: showSubmitError, onSettled: settle },
      )
    }, settle)(event)
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-6">
        <MoneyInput label="Target Amounts" fieldSize="lg" error={errors.target?.message} {...register('target')} />
        <MoneyInput
          label="Present Amounts"
          fieldSize="lg"
          placeholder="Write present amount here"
          error={errors.present?.message}
          {...register('present')}
        />
      </div>
      {errors.root?.server && (
        <p role="alert" className="mt-4 text-14 text-danger">
          {errors.root.server.message}
        </p>
      )}
      <div className="mt-8 flex justify-center">
        <div className="w-48">
          <Button type="submit" fullWidth disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  )
}

/**
 * Edits a month's savings goal (110.2. Goals.png, plus the Present field): Target and Present,
 * prefilled with the stored amounts, and a centred "Save". Save persists through
 * `updateSavingsGoal` and closes only once every active savings-goal query has refetched, so the
 * card already shows the new values. Every other close path (X, Esc, overlay) discards edits;
 * while a save is pending, close requests are ignored so an edit is never persisted after a
 * "discard" and a rejection is never lost.
 */
export function AdjustSavingsGoalModal({ open, onClose, month, goal }: AdjustSavingsGoalModalProps) {
  const update = useUpdateSavingsGoal()
  const requestClose = () => {
    if (!update.isPending) onClose()
  }
  return (
    <Modal open={open} onClose={requestClose} label="Adjust savings goal">
      {/* Mounted only while open, so each opening starts from the stored values. */}
      <AdjustSavingsGoalForm month={month} goal={goal} onClose={onClose} update={update} />
    </Modal>
  )
}
