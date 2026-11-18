import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useUpdateCategoryLimit } from '../../../api/hooks/useUpdateCategoryLimit.ts'
import type { CategoryLimit } from '../../../api/types.ts'
import { formatMoney } from '../../../lib/format.ts'
import { FormModal, FormModalForm } from '../../../ui/FormModal.tsx'
import { categoryLabels } from '../../../ui/categoryLabels.ts'
import { MoneyInput } from '../../../ui/MoneyInput.tsx'
import { categoryLimitSchema, type CategoryLimitFormInput, type CategoryLimitFormValues } from '../schemas.ts'

// The adapter's field name, mapped onto this form's input.
const fieldByApiField = { limitCents: 'target' } as const

export type AdjustCategoryLimitModalProps = {
  open: boolean
  onClose: () => void
  /** The stored limit being edited, used to prefill "Target Amounts". */
  limit: CategoryLimit
}

type FormProps = Omit<AdjustCategoryLimitModalProps, 'open'> & {
  update: ReturnType<typeof useUpdateCategoryLimit>
}

function AdjustCategoryLimitForm({ limit, onClose, update }: FormProps) {
  const form = useForm<CategoryLimitFormInput, unknown, CategoryLimitFormValues>({
    resolver: zodResolver(categoryLimitSchema),
    defaultValues: { target: formatMoney(limit.limitCents, 'exact') },
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
      onSave={({ target }, handlers) =>
        update.mutate({ category: limit.category, limitCents: target }, { ...handlers, onSuccess: onClose })
      }
    >
      <MoneyInput label="Target Amounts" fieldSize="lg" error={errors.target?.message} {...register('target')} />
    </FormModalForm>
  )
}

/**
 * Edits one category's monthly spending limit (110.2. Goals.png): "Target Amounts", prefilled with
 * the stored limit, and a centred "Save". Save persists only that category through
 * `updateCategoryLimit` and closes once the category-limits query has refetched, so the card
 * already shows the new limit. X, Esc and an overlay click discard edits, and are ignored while a
 * save is pending.
 */
export function AdjustCategoryLimitModal({ open, onClose, limit }: AdjustCategoryLimitModalProps) {
  const update = useUpdateCategoryLimit()
  return (
    <FormModal
      open={open}
      onClose={onClose}
      label={`Adjust ${categoryLabels[limit.category]} limit`}
      pending={update.isPending}
    >
      {/* Mounted only while open, so each opening starts from the stored limit. */}
      <AdjustCategoryLimitForm limit={limit} onClose={onClose} update={update} />
    </FormModal>
  )
}
