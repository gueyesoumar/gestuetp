interface FormFieldProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string | null
  required?: boolean
  disabled?: boolean
  placeholder?: string
  multiline?: boolean
  hint?: string
}

export function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder,
  multiline = false,
  hint,
}: FormFieldProps) {
  const hasError = !!error
  const errorId = hasError ? `${id}-error` : undefined
  const hintId = hint && !hasError ? `${id}-hint` : undefined
  const describedBy = errorId ?? hintId

  const baseClass = 'mt-1 block w-full rounded-lg border px-3 py-2 text-[13px] outline-none disabled:bg-gray-50 transition-colors'
  const stateClass = hasError
    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/30'
    : 'border-gray-200 focus:border-forest-500 focus:ring-2 focus:ring-forest-100'

  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          rows={3}
          className={`${baseClass} ${stateClass}`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={`${baseClass} ${stateClass}`}
        />
      )}
      {hasError ? (
        <p id={errorId} className="mt-1 text-[11.5px] text-red-600 flex items-start gap-1">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-[11px] text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
}
