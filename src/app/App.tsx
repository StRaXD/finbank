// Story 1.2 token specimen. Story 1.6 replaces this with the router.
import wordmarkTeal from '../assets/brands/wordmark-teal.svg'
import wordmarkWhite from '../assets/brands/wordmark-white.svg'
import { Button } from '../ui/Button.tsx'
import { Checkbox } from '../ui/Checkbox.tsx'
import { FormStatus } from '../ui/FormStatus.tsx'
import { PasswordInput } from '../ui/PasswordInput.tsx'
import { TextInput } from '../ui/TextInput.tsx'

const weights = [
  { label: 'Regular', className: 'font-normal' },
  { label: 'Medium', className: 'font-medium' },
  { label: 'Semi Bold', className: 'font-semibold' },
  { label: 'Bold', className: 'font-bold' },
  { label: 'Extra Bold', className: 'font-extrabold' },
] as const

// Weights follow Typography-color.png: the 18 and 22 steps are bold, 20 and 24 medium/semibold.
const typeSteps = [
  { size: 12, lineHeight: 16, className: 'text-12 font-normal', sample: 'The quick brown fox jumps over the lazy dog' },
  { size: 14, lineHeight: 20, className: 'text-14 font-normal', sample: 'The quick brown fox jumps over the lazy dog' },
  { size: 16, lineHeight: 24, className: 'text-16 font-normal', sample: 'The quick brown fox jumps over the lazy dog' },
  { size: 18, lineHeight: 24, className: 'text-18 font-bold', sample: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
  { size: 20, lineHeight: 28, className: 'text-20 font-medium', sample: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
  { size: 22, lineHeight: 32, className: 'text-22 font-bold', sample: 'The Quick Brown Fox Jumps Over The Lazy' },
  { size: 24, lineHeight: 28, className: 'text-24 font-semibold', sample: 'The quick brown fox jumps over the lazy' },
] as const

const swatches = [
  { name: 'primary', className: 'bg-primary' },
  { name: 'ink', className: 'bg-ink' },
  { name: 'ink-2', className: 'bg-ink-2' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'subtle', className: 'bg-subtle' },
  { name: 'faint', className: 'bg-faint' },
  { name: 'border', className: 'bg-border' },
  { name: 'surface', className: 'bg-surface' },
] as const

const darkSwatches = [
  { name: 'danger', className: 'bg-danger' },
  { name: 'positive', className: 'bg-positive' },
  { name: 'on-dark-divider', className: 'bg-on-dark-divider' },
  { name: 'on-dark-muted', className: 'bg-on-dark-muted' },
  { name: 'on-dark-hover', className: 'bg-on-dark-hover' },
] as const

function App() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 p-20">
      <h1 className="text-24 font-bold">Finbank design tokens</h1>

      <section aria-labelledby="weights-heading" className="flex flex-col gap-4">
        <h2 id="weights-heading" className="text-20 font-semibold">
          Inter weights
        </h2>
        {weights.map((w) => (
          <p key={w.label} className={`grid grid-cols-[16rem_1fr] text-24 ${w.className}`}>
            <span>{w.label}</span>
            <span>AaBbCcDdEeGgNn 1234567890</span>
          </p>
        ))}
      </section>

      <section aria-labelledby="scale-heading" className="flex flex-col gap-4">
        <h2 id="scale-heading" className="text-20 font-semibold">
          Type scale
        </h2>
        {typeSteps.map((step) => (
          <div key={step.size} className="grid grid-cols-[3rem_3rem_1fr] items-center">
            <span className="text-12 text-muted">{step.size}</span>
            <span className="text-12 text-muted">{step.lineHeight}</span>
            <p data-testid={`type-step-${step.size}`} className={step.className}>
              {step.sample}
            </p>
          </div>
        ))}
      </section>

      <section aria-labelledby="colors-heading" className="flex flex-col gap-6">
        <h2 id="colors-heading" className="text-20 font-semibold">
          Color
        </h2>
        <ul className="flex flex-wrap gap-8">
          {swatches.map((s) => (
            <li key={s.name} className="flex flex-col gap-3 text-16">
              <span className={`size-16 ${s.className}`} />
              {s.name}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-6 bg-sidebar p-6 text-on-dark">
          <h3 className="text-20 font-semibold">Special colors</h3>
          <ul className="flex flex-wrap gap-8">
            {darkSwatches.map((s) => (
              <li key={s.name} className="flex flex-col gap-3 text-16">
                <span className={`size-16 ${s.className}`} />
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="surfaces-heading" className="flex flex-col gap-6">
        <h2 id="surfaces-heading" className="text-20 font-semibold">
          Surfaces and brand
        </h2>
        <div className="flex flex-wrap items-start gap-8">
          <div data-testid="specimen-card" className="flex w-96 flex-col items-center gap-4 rounded-card bg-card p-8 shadow-card">
            <img src={wordmarkTeal} alt="FINEbank.IO" width={271} height={31} />
            <p className="text-14 text-ink-2">Card surface: white, 8px radius, soft shadow</p>
            <button type="button" className="rounded-card px-4 py-2 text-16 font-semibold text-primary">
              Tab here to see the focus ring
            </button>
          </div>
          <div data-testid="specimen-sidebar" className="flex w-72 flex-col items-center gap-4 bg-sidebar p-8">
            <img src={wordmarkWhite} alt="FINEbank.IO" width={163} height={18} />
            <p className="text-14 text-on-dark-muted">Sidebar surface</p>
            <div className="h-px w-full bg-on-dark-divider" />
            <p className="w-full rounded-card bg-on-dark-hover px-4 py-3 text-16 text-on-dark">
              Hover / Logout background
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="components-heading" data-testid="specimen-components" className="flex flex-col gap-8">
        <h2 id="components-heading" className="text-20 font-semibold">
          Components
        </h2>

        <div className="grid grid-cols-2 gap-12">
          <div className="flex w-96 flex-col gap-3">
            <h3 className="text-16 font-semibold text-muted">Buttons</h3>
            <Button fullWidth>Login</Button>
            <Button fullWidth disabled>
              Login
            </Button>
            <Button variant="google" fullWidth>
              Continue with Google
            </Button>
            <Button variant="google" fullWidth disabled>
              Continue with Google
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Add Accounts</Button>
              <Button size="sm" trailingIcon="chevronRight">
                Details
              </Button>
              <Button variant="outline" size="sm" trailingIcon="pencil">
                Adjust
              </Button>
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Button variant="text">Create an account</Button>
              <Button variant="text" size="sm">
                Forgot Password?
              </Button>
              <Button variant="text" disabled>
                Disabled link
              </Button>
            </div>
          </div>

          <div className="flex w-96 flex-col gap-4">
            <h3 className="text-16 font-semibold text-muted">Inputs</h3>
            <TextInput label="Email Address" type="email" placeholder="johndoe@email.com" />
            <TextInput label="Email (filled)" type="email" defaultValue="hello@example.com" placeholder="johndoe@email.com" />
            <TextInput label="Email (error)" type="email" defaultValue="hello@" error="Enter a valid email address" />
            <PasswordInput label="Password" placeholder="••••••••••••••" />
            <PasswordInput label="Password (error)" error="Password is required" />
            <TextInput label="Email (disabled)" type="email" disabled defaultValue="hello@example.com" />
            <PasswordInput label="Password (disabled)" disabled defaultValue="secret-password" />
            <TextInput label="Full name (borderless)" variant="borderless" defaultValue="Tanzir Rahman" />
            <TextInput label="Full name (borderless, error)" variant="borderless" error="Name is required" />
            <Checkbox label="Keep me signed in" defaultChecked />
            <Checkbox label="Unchecked" />
            <Checkbox label="Disabled checked" defaultChecked disabled />
            <Checkbox label="Disabled unchecked" disabled />
            <Checkbox label="Accept terms" error="You must accept the terms" />
            <div className="flex items-center gap-4">
              <Button>Update Profile</Button>
              <FormStatus message="Profile updated" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
