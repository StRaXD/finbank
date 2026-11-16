import type { ReactNode } from 'react'
import wordmarkTeal from '../../../assets/brands/wordmark-teal.svg'

export type AuthLayoutProps = {
  /** The page's only `h1`. Visually hidden: the design shows just the wordmark. */
  title: string
  children: ReactNode
}

/** The shared auth column (101–103 PNGs): about 400px wide on `surface`, teal wordmark on top. */
export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-surface pt-40 pb-16">
      <div className="mx-auto flex w-100 flex-col">
        <h1 className="sr-only">{title}</h1>
        <img src={wordmarkTeal} alt="FINEbank.IO" width={271} height={31} className="self-center" />
        <div className="mt-16.5">{children}</div>
      </div>
    </main>
  )
}
