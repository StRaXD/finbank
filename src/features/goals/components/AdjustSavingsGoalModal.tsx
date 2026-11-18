import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useUpdateSavingsGoal } from '../../../api/hooks/useUpdateSavingsGoal.ts'
import type { SavingsGoal, YearMonth } from '../../../api/types.ts'
import { formatMoney } from '../../../lib/format.ts'
import { FormModal, FormModalForm } from '../../../ui/FormModal.tsx'
import { MoneyInput } from '../../../ui/MoneyInput.tsx'
import { savingsGoalSchema, type SavingsGoalFormInput, type SavingsGoalFormValues } from '../schemas.ts'

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
  const form = useForm<SavingsGoalFormInput, unknown, SavingsGoalFormValues>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      target: formatMoney(goal.targetCents, 'exact'),
      present: formatMoney(goal.achievedCents, 'exact'),
    },
  })
  const {
    register,
    formState: { errors },
  } = form

  return (
    <FormModalForm
      form={form}
      fieldByApiField={fieldByApiField}
      pending={update.isPending}
      onSave={({ target, present }, handlers) =>
        update.mutate({ month, targetCents: target, achievedCents: present }, { ...handlers, onSuccess: onClose })
      }
    >
      <MoneyInput label="Target Amounts" fieldSize="lg" error={errors.target?.message} {...register('target')} />
      <MoneyInput
        label="Present Amounts"
        fieldSize="lg"
        placeholder="Write present amount here"
        error={errors.present?.message}
        {...register('present')}
      />
    </FormModalForm>
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
  return (
    <FormModal open={open} onClose={onClose} label="Adjust savings goal" pending={update.isPending}>
      {/* Mounted only while open, so each opening starts from the stored values. */}
      <AdjustSavingsGoalForm month={month} goal={goal} onClose={onClose} update={update} />
    </FormModal>
  )
}
