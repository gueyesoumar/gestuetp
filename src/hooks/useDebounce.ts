import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that updates only after `delayMs`
 * have elapsed without further changes.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])

  return debounced
}
