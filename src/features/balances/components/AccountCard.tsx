import { useId } from 'react'
import { Link } from 'react-router'
import type { Account } from '../../../api/types.ts'
import { formatMoney, maskAccountNumber } from '../../../lib/format.ts'
import { Button } from '../../../ui/Button.tsx'
import { buttonClassName, buttonIconSize } from '../../../ui/buttonStyles.ts'
import { icons } from '../../../ui/icons.ts'
import { accountTypeLabels } from '../accountTypeLabels.ts'
import { NetworkLogo } from './NetworkLogo.tsx'

export type AccountCardProps = {
  account: Account
  /** Where "Details" goes: the account's Account Details page. */
  detailsHref: string
  /** Called by "Remove". Story 2.2 supplies it; until then "Remove" does nothing. */
  onRemove?: (account: Account) => void
}

const ChevronRight = icons.chevronRight

/**
 * One account on Balances (measured from 105. Balances.png): type and bank over a divider, the
 * `groups`-masked number, the whole-dollar balance, then "Remove" and "Details >".
 */
export function AccountCard({ account, detailsHref, onRemove }: AccountCardProps) {
  const titleId = useId()
  return (
    <article
      aria-labelledby={titleId}
      data-testid="account-card"
      className="flex flex-col rounded-card bg-card p-6 shadow-card"
    >
      {/* min-h includes the 12px bottom padding: a 32px row, as measured from 105. Balances.png. */}
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border pb-3">
        <h2 id={titleId} className="text-16 font-bold text-subtle">
          {accountTypeLabels[account.type]}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-12 font-medium text-ink-2">{account.bankName}</span>
          {account.network && <NetworkLogo network={account.network} />}
        </div>
      </div>
      <dl className="flex flex-col-reverse gap-1 pt-4">
        <dt className="text-14 text-subtle">Account Number</dt>
        <dd className="text-20 font-semibold text-ink">{maskAccountNumber(account.accountNumber, 'groups')}</dd>
      </dl>
      <dl className="flex flex-col-reverse gap-1 pt-4">
        <dt className="text-14 text-subtle">Total amount</dt>
        <dd className="text-20 font-semibold text-ink">{formatMoney(account.balanceCents, 'whole')}</dd>
      </dl>
      <div className="mt-6 flex items-center justify-between gap-4">
        <Button variant="text" aria-describedby={titleId} onClick={() => onRemove?.(account)}>
          Remove
        </Button>
        <Link
          to={detailsHref}
          aria-describedby={titleId}
          className={buttonClassName({ variant: 'primary', size: 'sm', asLink: true })}>
          Details
          <ChevronRight aria-hidden="true" data-icon="chevronRight" size={buttonIconSize.sm} />
        </Link>
      </div>
    </article>
  )
}
