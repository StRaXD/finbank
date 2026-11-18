import { z } from 'zod'
import {
  ACCOUNT_NAME_LENGTH_MESSAGE,
  ACCOUNT_NAME_MAX,
  ACCOUNT_NUMBER_DIGITS,
  ACCOUNT_NUMBER_FORMAT_MESSAGE,
  ACCOUNT_NUMBER_REQUIRED_MESSAGE,
  ACCOUNT_TYPE_REQUIRED_MESSAGE,
  type AccountInput,
  type AccountType,
  BALANCE_NEGATIVE_MESSAGE,
  BALANCE_REQUIRED_MESSAGE,
  BANK_NAME_REQUIRED_MESSAGE,
  BRANCH_NAME_REQUIRED_MESSAGE,
  CARD_NETWORK_REQUIRED_MESSAGE,
  type CardNetwork,
  hasCardNetwork,
  stripAccountNumber,
} from '../../api/types.ts'
import { dollarsToCents } from '../../lib/money.ts'
import { accountTypeLabels } from './accountTypeLabels.ts'

/** The Account Type options, in display order. */
export const accountTypeOptions = (Object.keys(accountTypeLabels) as AccountType[]).map((value) => ({
  value,
  label: accountTypeLabels[value],
}))

/** The Card Network options (Credit Card and Checking only). */
export const cardNetworkOptions: { value: CardNetwork; label: string }[] = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'other', label: 'Other' },
]

const isAccountType = (value: string): value is AccountType => Object.hasOwn(accountTypeLabels, value)
const isCardNetwork = (value: string): value is CardNetwork => cardNetworkOptions.some((option) => option.value === value)

/** What the Account form holds: the dropdowns start empty (`''`), and Balance is typed text. */
export type AccountFormInput = {
  type: AccountType | ''
  bankName: string
  branchName: string
  network: CardNetwork | ''
  accountNumber: string
  balance: string
}

/** The validated form, ready for `createAccount`. */
export type AccountFormValues = AccountInput

/**
 * The Account form: every field required. Names are trimmed and at most `ACCOUNT_NAME_MAX`
 * characters; Card Network is required only for Credit Card and Checking (and dropped otherwise);
 * the number loses its spaces and dashes and must be 8–19 digits; Balance is a dollar amount of
 * zero or more, in cents. Uniqueness of the number is checked by the adapter. Every failing field
 * reports at once. The money parsing is this feature's own (AD-1: no import from features/goals).
 */
export const accountFormSchema = z
  .object({
    type: z.custom<AccountType | ''>((value) => typeof value === 'string'),
    bankName: z.string(),
    branchName: z.string(),
    network: z.custom<CardNetwork | ''>((value) => typeof value === 'string'),
    accountNumber: z.string(),
    balance: z.string(),
  })
  .transform((input, ctx): AccountFormValues => {
    // The dropdowns hold '' or an option value; anything else reads as no choice.
    let valid = true
    const issue = (path: keyof AccountFormInput, message: string) => {
      valid = false
      ctx.addIssue({ code: 'custom', path: [path], message })
    }

    const type = isAccountType(input.type) ? input.type : null
    if (!type) issue('type', ACCOUNT_TYPE_REQUIRED_MESSAGE)

    const name = (value: string, field: 'bankName' | 'branchName', required: string) => {
      const trimmed = value.trim()
      if (trimmed === '') issue(field, required)
      else if (trimmed.length > ACCOUNT_NAME_MAX) issue(field, ACCOUNT_NAME_LENGTH_MESSAGE)
      return trimmed
    }
    const bankName = name(input.bankName, 'bankName', BANK_NAME_REQUIRED_MESSAGE)
    const branchName = name(input.branchName, 'branchName', BRANCH_NAME_REQUIRED_MESSAGE)

    const card = type !== null && hasCardNetwork(type)
    const network = card && isCardNetwork(input.network) ? input.network : undefined
    if (card && !network) issue('network', CARD_NETWORK_REQUIRED_MESSAGE)

    const accountNumber = stripAccountNumber(input.accountNumber)
    const [minDigits, maxDigits] = ACCOUNT_NUMBER_DIGITS
    if (accountNumber === '') issue('accountNumber', ACCOUNT_NUMBER_REQUIRED_MESSAGE)
    else if (!/^\d+$/.test(accountNumber) || accountNumber.length < minDigits || accountNumber.length > maxDigits) {
      issue('accountNumber', ACCOUNT_NUMBER_FORMAT_MESSAGE)
    }

    const balanceCents = dollarsToCents(input.balance)
    if (balanceCents === null) issue('balance', BALANCE_REQUIRED_MESSAGE)
    else if (balanceCents < 0) issue('balance', BALANCE_NEGATIVE_MESSAGE)

    if (!valid) return z.NEVER
    return {
      type: type!,
      bankName,
      branchName,
      ...(network && { network }),
      accountNumber,
      balanceCents: balanceCents!,
    }
  })

/** The empty Add form: both dropdowns on their placeholder. */
export const emptyAccountForm: AccountFormInput = {
  type: '',
  bankName: '',
  branchName: '',
  network: '',
  accountNumber: '',
  balance: '',
}
