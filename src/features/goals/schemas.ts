import { z } from 'zod'
import { dollarsToCents } from '../../lib/money.ts'

export const amountFormatMessage = 'Enter an amount, like 1,234.50.'
export const amountNegativeMessage = "Amount can't be negative."

/** A typed dollar amount: required, parseable by `dollarsToCents`, and zero or more. Outputs cents. */
const money = z.string().transform((text, ctx) => {
  const cents = dollarsToCents(text)
  if (cents === null) {
    ctx.addIssue({ code: 'custom', message: amountFormatMessage })
    return z.NEVER
  }
  if (cents < 0) {
    ctx.addIssue({ code: 'custom', message: amountNegativeMessage })
    return z.NEVER
  }
  return cents
})

/** The Adjust Savings Goal form. Present may exceed Target. */
export const savingsGoalSchema = z.object({
  target: money,
  present: money,
})

export type SavingsGoalFormInput = z.input<typeof savingsGoalSchema>
export type SavingsGoalFormValues = z.output<typeof savingsGoalSchema>
