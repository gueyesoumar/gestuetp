import { useRef, useEffect } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'

interface OtpInputProps {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  invalid?: boolean
}

/**
 * Saisie de code à usage unique segmentée (une case par chiffre) : avance
 * automatique, retour arrière, collage et navigation clavier. La valeur est une
 * chaîne compacte de chiffres ; la saisie se fait de gauche à droite.
 */
export function OtpInput({ value, onChange, onComplete, length = 6, disabled = false, autoFocus = false, invalid = false }: OtpInputProps): JSX.Element {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  // Miroir de la valeur courante : lu par les handlers pour éviter la closure
  // périmée (le setState du parent n'est pas encore appliqué quand on enchaîne
  // deux chiffres avant un re-render).
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const commit = (next: string): string => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    valueRef.current = clean
    onChange(clean)
    return clean
  }

  const handleChange = (i: number, raw: string): void => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    if (!digit) return
    const clean = commit(valueRef.current.slice(0, i) + digit)
    refs.current[Math.min(clean.length, length - 1)]?.focus()
    if (clean.length === length) onComplete?.(clean)
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const cur = valueRef.current
      const cut = cur[i] ? i : Math.max(0, i - 1)
      commit(cur.slice(0, cut))
      refs.current[cut]?.focus()
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault()
    const clean = commit(e.clipboardData.getData('text'))
    refs.current[Math.min(clean.length, length - 1)]?.focus()
    if (clean.length === length) onComplete?.(clean)
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label={`Code à ${length} chiffres`}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1}
          value={value[i] ?? ''} disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Chiffre ${i + 1}`}
          className={`h-14 w-11 rounded-xl border text-center text-xl font-mono text-gray-900 outline-none transition-colors focus:ring-2 ${
            invalid ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-300 focus:border-forest-500 focus:ring-forest-100'
          } disabled:opacity-50`}
        />
      ))}
    </div>
  )
}
