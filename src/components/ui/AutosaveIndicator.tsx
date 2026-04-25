import { useEffect, useState } from 'react'
import { Check, Loader2, AlertCircle, CircleDot } from 'lucide-react'
import type { AutosaveStatus } from '../../hooks/useAutosave'

interface AutosaveIndicatorProps {
  status: AutosaveStatus
  lastSavedAt: number | null
  onRetry?: () => void
}

function formatRelative(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 5) return 'à l\'instant'
  if (sec < 60) return `il y a ${sec} s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  return `il y a ${h} h`
}

export function AutosaveIndicator({ status, lastSavedAt, onRetry }: AutosaveIndicatorProps) {
  const [now, setNow] = useState(() => Date.now())

  // Refresh the relative timestamp every 30 s.
  useEffect(() => {
    if (status !== 'saved' || !lastSavedAt) return
    setNow(Date.now())
    const handle = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(handle)
  }, [status, lastSavedAt])

  if (status === 'idle' && !lastSavedAt) return null

  if (status === 'modified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-gray-400">
        <CircleDot size={12} />
        Modifications non enregistrées
      </span>
    )
  }

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-forest-700">
        <Loader2 size={12} className="animate-spin" />
        Enregistrement…
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-2 text-[11.5px] text-red-600">
        <AlertCircle size={12} />
        Échec d'enregistrement
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-red-700 underline underline-offset-2 hover:no-underline"
          >
            Réessayer
          </button>
        )}
      </span>
    )
  }

  // saved (or idle with a previous save) → show relative time
  if (lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-gray-400">
        <Check size={12} className="text-success" />
        Enregistré {formatRelative(now - lastSavedAt)}
      </span>
    )
  }

  return null
}
