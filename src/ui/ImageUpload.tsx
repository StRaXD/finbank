import { useId, useRef, type ChangeEvent } from 'react'
import { icons } from './icons.ts'

export type ImageUploadProps = {
  /** The visible label above the box; it names the group. */
  label: string
  /** The image the box shows (a preview or the saved one). Empty shows the upload prompt. */
  imageUrl?: string | null
  /** Called with the picked file. Validation is the caller's job. */
  onSelect: (file: File) => void
  error?: string
  /** The file input's `accept`, e.g. `image/jpeg,image/png`. */
  accept?: string
}

/**
 * The dashed photo upload box (111. Settings.png): a native button, so click, Enter and Space all
 * open the file picker. It shows `imageUrl` when given, otherwise an image-plus icon and "Upload
 * your photo". Purely presentational: the caller validates, previews and saves the pick.
 */
export function ImageUpload({ label, imageUrl, onSelect, error, accept }: ImageUploadProps) {
  const id = useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const inputRef = useRef<HTMLInputElement>(null)
  const ImagePlus = icons.imagePlus

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Cleared so picking the same file again still fires a change.
    event.target.value = ''
    if (file) onSelect(file)
  }

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col items-start">
      <p id={labelId} className="text-16 font-medium text-muted">
        {label}
      </p>
      {/* 1px dashed `faint` outline, drawn in SVG for the PNG's dash length (6px dashes, 4px gaps). */}
      <button
        type="button"
        aria-label={imageUrl ? 'Change your photo' : 'Upload your photo'}
        aria-describedby={error ? errorId : undefined}
        onClick={() => inputRef.current?.click()}
        className="relative mt-8 ml-0.75 flex h-32.5 w-35.5 cursor-pointer flex-col items-center overflow-hidden rounded-input"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <ImagePlus aria-hidden="true" data-icon="imagePlus" size={36} className="mt-6 shrink-0 text-subtle" />
            <span aria-hidden="true" className="mt-3.5 w-20 text-center text-12 text-subtle">
              Upload your photo
            </span>
          </>
        )}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
          <rect
            width="100%"
            height="100%"
            rx="8"
            fill="none"
            // Twice the visible width: the outer half falls outside the box and is clipped.
            strokeWidth="2"
            strokeDasharray="6 4"
            className={error ? 'stroke-danger' : 'stroke-faint'}
          />
        </svg>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        tabIndex={-1}
        aria-hidden="true"
        data-testid="image-upload-input"
        className="hidden"
        onChange={onChange}
      />
      {error && (
        // An alert, so the error is announced once the OS file picker closes.
        <p id={errorId} role="alert" className="mt-2 text-14 text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
