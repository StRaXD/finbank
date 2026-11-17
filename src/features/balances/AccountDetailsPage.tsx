import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAccount } from '../../api/hooks/useAccount.ts'
import type { Account } from '../../api/types.ts'
import { formatMoney, maskAccountNumber } from '../../lib/format.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
import { Button } from '../../ui/Button.tsx'
import { buttonClassName } from '../../ui/buttonStyles.ts'
import { Card } from '../../ui/Card.tsx'
import { EmptyState } from '../../ui/EmptyState.tsx'
import { TransactionList } from '../transactions/index.ts'
import { accountTypeLabels } from './accountTypeLabels.ts'
import { RemoveAccountDialog } from './components/RemoveAccountDialog.tsx'

export type AccountDetailsPageProps = {
  /** The Balances URL (owned by the app's route table): the not-found link and where removal lands. */
  balancesPath: string
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-16 text-subtle">{label}</dt>
      <dd className="text-20 font-bold text-ink-2">{value}</dd>
    </div>
  )
}

function DetailsCard({ account, onRemove }: { account: Account; onRemove: () => void }) {
  return (
    <div data-testid="account-details" className="rounded-card bg-card px-8 pt-8 pb-10 shadow-card">
      {/* Columns 317px apart in a 1039px row, measured from 106. Account Details.png. */}
      <dl className="grid grid-cols-[repeat(3,30.5%)] gap-y-8">
        <Detail label="Bank Name" value={account.bankName} />
        <Detail label="Account Type" value={accountTypeLabels[account.type]} />
        <Detail label="Balance" value={formatMoney(account.balanceCents, 'exact')} />
        <Detail label="Branch Name" value={account.branchName} />
        <Detail label="Account Number" value={maskAccountNumber(account.accountNumber, 'groups')} />
      </dl>
      <div className="mt-9 flex items-center gap-10">
        <div className="w-40">
          {/* Inert in this release. */}
          <Button fullWidth>Edit Details</Button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="cursor-pointer rounded-button text-14 font-semibold text-ink-2 hover:underline"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

/**
 * Account Details (106. Account Details.png): one account's details, matching its Balances card,
 * then its paged transaction history. Removing goes back to Balances first (AD-13), so this page
 * never renders a missing account.
 */
export function AccountDetailsPage({ balancesPath }: AccountDetailsPageProps) {
  const { accountId = '' } = useParams()
  const account = useAccount(accountId)
  const navigate = useNavigate()
  const [removing, setRemoving] = useState<Account | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-22 font-normal text-subtle">Account Details</h1>
      <AsyncSection query={account} emptyMessage="Account not found.">
        {(found) =>
          found === null ? (
            <div className="flex flex-col items-start gap-3">
              <EmptyState message="Account not found." />
              <Link to={balancesPath} className={buttonClassName({ variant: 'text', asLink: true })}>
                Back to Balances
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <DetailsCard account={found} onRemove={() => setRemoving(found)} />
              <Card title="Transactions History">
                <TransactionList variant="history" accountId={found.id} limit={10} loadMore />
              </Card>
            </div>
          )
        }
      </AsyncSection>
      <RemoveAccountDialog
        account={removing}
        onClose={() => setRemoving(null)}
        onConfirmStart={() => void navigate(balancesPath, { replace: true })}
      />
    </div>
  )
}
