import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useCreateAccount } from '../../../api/hooks/useCreateAccount.ts'
import { type AccountType, hasCardNetwork } from '../../../api/types.ts'
import { Dropdown } from '../../../ui/Dropdown.tsx'
import { FormModal, FormModalForm } from '../../../ui/FormModal.tsx'
import { MoneyInput } from '../../../ui/MoneyInput.tsx'
import { TextInput } from '../../../ui/TextInput.tsx'
import {
  type AccountFormInput,
  type AccountFormValues,
  accountFormSchema,
  accountTypeOptions,
  cardNetworkOptions,
  emptyAccountForm,
} from '../schemas.ts'

// The adapter's field names, mapped onto this form's inputs.
const fieldByApiField = {
  type: 'type',
  bankName: 'bankName',
  branchName: 'branchName',
  network: 'network',
  accountNumber: 'accountNumber',
  balanceCents: 'balance',
} as const

/** The fields in display order: a failed Save focuses the first invalid one. */
const fieldOrder: readonly (keyof AccountFormInput)[] = ['type', 'bankName', 'branchName', 'network', 'accountNumber', 'balance']

/** Credit Card and Loan balances are amounts owed; the others are balances. */
const balanceLabel = (type: AccountType | '') => (type === 'creditCard' || type === 'loan' ? 'Amount owed' : 'Balance')

export type AccountFormModalProps = {
  open: boolean
  onClose: () => void
  /** Called once a new account is saved and the account list has refetched, just before `onClose`. */
  onSaved?: () => void
}

type FormProps = Pick<AccountFormModalProps, 'onClose' | 'onSaved'> & {
  create: ReturnType<typeof useCreateAccount>
}

function AccountForm({ onClose, onSaved, create }: FormProps) {
  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: emptyAccountForm,
    // Focus follows display order (see `onInvalid`), including the Card Network that mounts late.
    shouldFocusError: false,
  })
  const {
    control,
    register,
    setValue,
    setFocus,
    formState: { errors },
  } = form
  const type = useWatch({ control, name: 'type' })
  const card = type !== '' && hasCardNetwork(type)

  return (
    <FormModalForm
      form={form}
      fieldByApiField={fieldByApiField}
      pending={create.isPending}
      focusServerErrors
      onInvalid={(invalid) => {
        const first = fieldOrder.find((name) => invalid[name])
        if (first) setFocus(first)
      }}
      onSave={(values, handlers) =>
        create.mutate(values, {
          ...handlers,
          onSuccess: () => {
            onSaved?.()
            onClose()
          },
        })
      }
    >
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Dropdown
            variant="field"
            label="Account Type"
            placeholder="Select type…"
            required
            options={accountTypeOptions}
            name={field.name}
            value={field.value}
            ref={field.ref}
            onBlur={field.onBlur}
            error={errors.type?.message}
            onChange={(next) => {
              field.onChange(next)
              // A type without a card has no network; switching back starts on the placeholder.
              if (!hasCardNetwork(next)) setValue('network', '')
            }}
          />
        )}
      />
      <TextInput label="Bank Name" fieldSize="lg" autoComplete="off" aria-required="true" error={errors.bankName?.message} {...register('bankName')} />
      <TextInput label="Branch Name" fieldSize="lg" autoComplete="off" aria-required="true" error={errors.branchName?.message} {...register('branchName')} />
      {card && (
        <Controller
          control={control}
          name="network"
          render={({ field }) => (
            <Dropdown
              variant="field"
              label="Card Network"
              placeholder="Select network…"
              required
              options={cardNetworkOptions}
              name={field.name}
              value={field.value}
              ref={field.ref}
              onBlur={field.onBlur}
              error={errors.network?.message}
              onChange={field.onChange}
            />
          )}
        />
      )}
      <TextInput
        label="Account Number"
        fieldSize="lg"
        inputMode="numeric"
        aria-required="true"
        autoComplete="off"
        error={errors.accountNumber?.message}
        {...register('accountNumber')}
      />
      <MoneyInput label={balanceLabel(type)} fieldSize="lg" aria-required="true" error={errors.balance?.message} {...register('balance')} />
    </FormModalForm>
  )
}

/**
 * Adds an account (the 110.2 modal pattern, no visible title; named "Add account"): Account Type,
 * Bank Name, Branch Name, Card Network (Credit Card and Checking only), Account Number and Balance
 * ("Amount owed" for Credit Card and Loan), then a centred "Save". Save persists through
 * `createAccount` and closes only once the account list has refetched, so the new card is already
 * on screen. X, Esc and an overlay click discard the form, and are ignored while saving. The form
 * is anchored higher (`tall`) so all six fields and Save fit at 1440×1024.
 */
export function AccountFormModal({ open, onClose, onSaved }: AccountFormModalProps) {
  const create = useCreateAccount()
  return (
    <FormModal open={open} onClose={onClose} label="Add account" pending={create.isPending} placement="tall">
      {/* Mounted only while open, so each opening starts empty. */}
      <AccountForm onClose={onClose} onSaved={onSaved} create={create} />
    </FormModal>
  )
}
