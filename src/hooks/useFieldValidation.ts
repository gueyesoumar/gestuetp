import { useState, useCallback } from 'react'

export type Validator = (value: string) => string | null

export interface FieldValidation {
  value: string
  setValue: (v: string) => void
  onChange: (v: string) => void
  onBlur: () => void
  touched: boolean
  /** Error to display in the UI (only after blur or forceShow). */
  error: string | null
  /** Underlying validation result regardless of touched state. */
  rawError: string | null
  isValid: boolean
  /** Mark as touched, e.g. on submit attempt — surfaces the error if any. */
  forceShow: () => void
  reset: (next?: string) => void
}

/**
 * Per-field validation hook for string-valued form fields.
 *
 * The error returned by `validate(value)` is hidden from the UI until the
 * user has blurred the field or `forceShow()` is called (typically on a
 * submit attempt). This avoids harassing the user while they type.
 *
 * Server-side validation remains the source of truth for trust — this is
 * a UX layer, not a security layer (CLAUDE.md §3).
 */
export function useFieldValidation(
  initial: string,
  validate: Validator,
): FieldValidation {
  const [value, setValue] = useState<string>(initial)
  const [touched, setTouched] = useState(false)

  const rawError = validate(value)
  const error = touched ? rawError : null

  const onChange = useCallback((next: string) => {
    setValue(next)
  }, [])

  const onBlur = useCallback(() => {
    setTouched(true)
  }, [])

  const forceShow = useCallback(() => {
    setTouched(true)
  }, [])

  const reset = useCallback((next?: string) => {
    setValue(next ?? initial)
    setTouched(false)
  }, [initial])

  return {
    value,
    setValue,
    onChange,
    onBlur,
    touched,
    error,
    rawError,
    isValid: rawError === null,
    forceShow,
    reset,
  }
}

// ── Common validators ──────────────────────────────────────────────────────

export const required = (message = 'Champ requis.'): Validator =>
  (v) => v.trim().length > 0 ? null : message

export const email = (message = 'Format d\'adresse email invalide.'): Validator =>
  (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : message

export const url = (message = 'URL invalide (ex. https://exemple.com).'): Validator =>
  (v) => {
    if (v === '') return null
    try {
      const parsed = new URL(v)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? null : message
    } catch {
      return message
    }
  }

export const phone = (message = 'Numéro de téléphone invalide.'): Validator =>
  (v) => v === '' || /^[+\d][\d\s().-]{6,}$/.test(v) ? null : message

export const minLength = (n: number, message?: string): Validator =>
  (v) => v.length >= n ? null : (message ?? `${n} caractères minimum.`)

export const compose = (...validators: Validator[]): Validator =>
  (v) => {
    for (const fn of validators) {
      const err = fn(v)
      if (err) return err
    }
    return null
  }
