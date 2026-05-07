import { useState } from 'react'
import { Info, ChevronDown, ChevronRight } from 'lucide-react'

interface ControlStatementCardProps {
  description: string | null
  guidance: string | null
  riskLevel?: number
}

const RISK_LABELS: Record<number, string> = {
  1: 'Très faible',
  2: 'Faible',
  3: 'Modéré',
  4: 'Élevé',
  5: 'Critique',
}

function riskBucket(level: number): 'low' | 'mid' | 'high' {
  if (level <= 2) return 'low'
  if (level >= 4) return 'high'
  return 'mid'
}

function dotClass(bucket: 'low' | 'mid' | 'high'): string {
  if (bucket === 'low') return 'bg-green-500'
  if (bucket === 'high') return 'bg-red-500'
  return 'bg-gold-500'
}

export function ControlStatementCard({ description, guidance, riskLevel }: ControlStatementCardProps) {
  const [open, setOpen] = useState(false)
  if (!description && !guidance) return null

  const level = Math.max(1, Math.min(5, riskLevel ?? 3))
  const bucket = riskBucket(level)
  const onColor = dotClass(bucket)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
        <span className="w-6 h-6 rounded-md bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
          <Info size={13} />
        </span>
        <h3 className="text-[13px] font-semibold text-gray-900 flex-1">&Eacute;nonc&eacute; du contr&ocirc;le</h3>
        <div className="flex items-center gap-1 shrink-0" aria-label={`Risque ${level} sur 5 — ${RISK_LABELS[level]}`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`w-4 h-1.5 rounded-sm ${i <= level ? onColor : 'bg-gray-200'}`}
            />
          ))}
          <span className="ml-1.5 text-[10px] text-gray-500 uppercase tracking-wide font-semibold">
            Risque {level}/5 &middot; {RISK_LABELS[level]}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 py-3">
          {description && (
            <p className="text-[13px] text-gray-700 leading-relaxed">{description}</p>
          )}
          {guidance && (
            <>
              <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 mt-3 mb-1">
                Objectif d&apos;audit
              </p>
              <p className="text-[12px] text-gray-700 leading-relaxed">{guidance}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
