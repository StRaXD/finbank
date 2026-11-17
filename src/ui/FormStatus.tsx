export type FormStatusProps = { message?: string }

/**
 * Inline success confirmation shown next to a form's submit button.
 * The `role="status"` region is always mounted (empty when there is no message) so screen
 * readers announce the message when it appears.
 */
export function FormStatus({ message }: FormStatusProps) {
  const text = message?.trim() ?? ''
  return (
    <p role="status" className="text-16 font-medium text-positive">
      {text}
    </p>
  )
}
