/** Nothing visible while a guard waits for data; `aria-busy` tells assistive tech it is loading. */
export function PageBusy() {
  return <div aria-busy="true" data-testid="page-busy" className="min-h-screen" />
}
