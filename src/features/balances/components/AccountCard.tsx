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
  /** Called by "Remove", with this card's account. */
  onRemove?: (account: Account) => void
  /** `grid` (default) is the Balances card; `carousel` is the teal Overview slide. */
  variant?: 'grid' | 'carousel'
}

const ChevronRight = icons.chevronRight
const ArrowUpRight = icons.arrowUpRight

/**
 * One account as the teal Overview carousel slide (measured from 104. Overview.png): "Account
 * Type" over the type, the `tail4`-masked number, the whole-dollar balance, the network logo and
 * a white round ↗ link to Account Details.
 */
function CarouselAccountCard({ account, detailsHref }: Pick<AccountCardProps, 'account' | 'detailsHref'>) {
  const titleId = useId()
  const type = accountTypeLabels[account.type]
  return (
    <article
      aria-labelledby={titleId}
      data-testid="account-slide"
      className="flex min-h-24 flex-col justify-between gap-1 rounded-card bg-primary px-4 py-3 text-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-14 text-on-dark-muted">Account Type</span>
          <h3 id={titleId} className="text-16 font-bold">
            {type}
          </h3>
        </div>
        {account.network && <NetworkLogo network={account.network} />}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-14 text-on-dark-soft">{maskAccountNumber(account.accountNumber, 'tail4')}</span>
        <div className="flex items-center gap-3">
          <span className="text-16 font-bold">{formatMoney(account.balanceCents, 'whole')}</span>
          <Link
            to={detailsHref}
            aria-label={`Open ${type} account details`}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-primary transition hover:brightness-90 focus-visible:outline-white"
          >
            <ArrowUpRight aria-hidden="true" data-icon="arrowUpRight" size={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}

/** One account: the Balances grid card, or (`variant="carousel"`) the Overview slide. */
export function AccountCard({ variant = 'grid', ...props }: AccountCardProps) {
  return variant === 'carousel' ? <CarouselAccountCard {...props} /> : <GridAccountCard {...props} />
}

/**
 * One account on Balances (measured from 105. Balances.png): type and bank over a divider, the
 * `groups`-masked number, the whole-dollar balance, then "Remove" and "Details >".
 */
function GridAccountCard({ account, detailsHref, onRemove }: Omit<AccountCardProps, 'variant'>) {
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
