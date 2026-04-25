import { useEffect, useRef, useState, useCallback } from 'react'
import { useDebounce } from './useDebounce'

export type AutosaveStatus = 'idle' | 'modified' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions<T> {
  /** Current value to watch. */
  value: T
  /** Save callback. Returning false marks the cycle as failed. */
  onSave: (value: T) => Promise<boolean>
  /** Debounce delay in ms (default: 1500). */
  delayMs?: number
  /** When true, autosave is disabled (e.g. read-only). Pending saves are flushed first. */
  disabled?: boolean
  /**
   * Equality check between current and last saved value. Defaults to JSON.stringify
   * comparison, which is fine for plain objects of strings/null. Provide a custom
   * predicate for non-serialisable shapes.
   */
  isEqual?: (a: T, b: T) => boolean
}

interface UseAutosaveResult {
  status: AutosaveStatus
  /** Timestamp (ms since epoch) of the last successful save, or null. */
  lastSavedAt: number | null
  /** Imperatively flush any pending change immediately. Returns the save result. */
  flush: () => Promise<boolean>
}

const defaultEquals = <T,>(a: T, b: T): boolean => JSON.stringify(a) === JSON.stringify(b)

/**
 * Autosave the given value via `onSave` after `delayMs` of inactivity.
 *
 * Behaviour:
 * - Tracks the last successfully saved snapshot ; skips redundant saves.
 * - Aborts in-flight cycles when a newer value arrives (only the latest wins).
 * - `flush()` is exposed for explicit save-now flows (manual button, submit,
 *   assessment switch).
 * - `disabled=true` blocks any new save and immediately flushes the pending one.
 *
 * Server-side persistence remains the source of truth — the autosave is a UX
 * comfort, not a security guarantee (CLAUDE.md §3).
 */
export function useAutosave<T>({
  value,
  onSave,
  delayMs = 1500,
  disabled = false,
  isEqual = defaultEquals,
}: UseAutosaveOptions<T>): UseAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const lastSavedValueRef = useRef<T>(value)
  const cycleRef = useRef(0)
  const onSaveRef = useRef(onSave)
  const isEqualRef = useRef(isEqual)

  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  useEffect(() => { isEqualRef.current = isEqual }, [isEqual])

  const debouncedValue = useDebounce(value, delayMs)

  // Mark "modified" as soon as the value diverges from the last save.
  useEffect(() => {
    if (disabled) return
    if (!isEqualRef.current(value, lastSavedValueRef.current)) {
      setStatus((s) => (s === 'saving' ? s : 'modified'))
    }
  }, [value, disabled])

  const performSave = useCallback(async (snapshot: T): Promise<boolean> => {
    if (isEqualRef.current(snapshot, lastSavedValueRef.current)) return true
    const myCycle = ++cycleRef.current
    setStatus('saving')
    try {
      const ok = await onSaveRef.current(snapshot)
      if (myCycle !== cycleRef.current) return ok // a newer cycle has started
      if (ok) {
        lastSavedValueRef.current = snapshot
        setLastSavedAt(Date.now())
        setStatus('saved')
      } else {
        setStatus('error')
      }
      return ok
    } catch (err) {
      console.error('[useAutosave] save threw:', err)
      if (myCycle === cycleRef.current) setStatus('error')
      return false
    }
  }, [])

  // Trigger save when the debounced value settles.
  useEffect(() => {
    if (disabled) return
    if (isEqualRef.current(debouncedValue, lastSavedValueRef.current)) return
    void performSave(debouncedValue)
  }, [debouncedValue, disabled, performSave])

  // Imperative flush — used on manual save, submit, or assessment switch.
  const flush = useCallback(async (): Promise<boolean> => {
    return performSave(value)
  }, [value, performSave])

  return { status, lastSavedAt, flush }
}
