import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FindingClassification, FindingPriority, FindingPatch } from './useAssessmentFindings'

export const CLASSIFICATION_OPTIONS: { value: FindingClassification; label: string; pillBg: string; cardBg: string; cardBorder: string }[] = [
  { value: 'major_nc',    label: 'NC majeure',  pillBg: 'bg-red-50 text-red-700',       cardBg: 'bg-red-50/30',     cardBorder: 'border-red-200' },
  { value: 'minor_nc',    label: 'NC mineure',  pillBg: 'bg-orange-50 text-orange-700', cardBg: 'bg-orange-50/30',  cardBorder: 'border-orange-200' },
  { value: 'observation', label: 'Observation', pillBg: 'bg-blue-50 text-blue-700',     cardBg: 'bg-blue-50/30',    cardBorder: 'border-blue-200' },
  { value: 'strength',    label: 'Point fort',  pillBg: 'bg-green-50 text-green-700',   cardBg: 'bg-green-50/30',   cardBorder: 'border-green-200' },
]

export const PRIORITY_OPTIONS: { value: FindingPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critique', color: 'bg-red-600 text-white border-red-600' },
  { value: 'high',     label: 'Haute',    color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'medium',   label: 'Moyenne',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'low',      label: 'Faible',   color: 'bg-gray-50 text-gray-600 border-gray-200' },
]

export function getClassificationConfig(value: FindingClassification) {
  return CLASSIFICATION_OPTIONS.find((c) => c.value === value) ?? CLASSIFICATION_OPTIONS[2]
}

export function getPriorityConfig(value: FindingPriority | null) {
  return value ? PRIORITY_OPTIONS.find((p) => p.value === value) ?? null : null
}

interface ClassificationPickerProps {
  value: FindingClassification
  readOnly: boolean
  onChange: (patch: FindingPatch) => void
}

export function FindingClassificationPicker({ value, readOnly, onChange }: ClassificationPickerProps) {
  const [open, setOpen] = useState(false)
  const cfg = getClassificationConfig(value)

  return (
    <div className="relative">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cfg.pillBg} disabled:opacity-50`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
        {cfg.label}
        {!readOnly && <ChevronDown size={10} />}
      </button>
      {open && !readOnly && (
        <div className="absolute top-full left-0 mt-1 z-10 flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[140px]">
          {CLASSIFICATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange({ classification: opt.value }); setOpen(false) }}
              className={`text-left text-[11px] px-2 py-1 rounded ${
                value === opt.value ? opt.pillBg + ' font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-60 mr-1.5" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface PriorityPickerProps {
  value: FindingPriority | null
  readOnly: boolean
  onChange: (patch: FindingPatch) => void
}

export function FindingPriorityPicker({ value, readOnly, onChange }: PriorityPickerProps) {
  const [open, setOpen] = useState(false)
  const cfg = getPriorityConfig(value)

  return (
    <div className="relative">
      {cfg ? (
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${cfg.color} disabled:opacity-50`}
        >
          {cfg.label}
          {!readOnly && <ChevronDown size={9} />}
        </button>
      ) : !readOnly ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[10px] text-gray-400 hover:text-gray-700 px-1.5 py-0.5 border border-dashed border-gray-300 rounded"
        >
          + Priorit&eacute;
        </button>
      ) : null}
      {open && !readOnly && (
        <div className="absolute top-full left-0 mt-1 z-10 flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[120px]">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange({ priority: opt.value }); setOpen(false) }}
              className={`text-left text-[11px] px-2 py-1 rounded border ${
                value === opt.value ? opt.color + ' font-semibold' : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {value && (
            <button
              type="button"
              onClick={() => { onChange({ priority: null }); setOpen(false) }}
              className="text-left text-[10px] px-2 py-1 text-gray-400 hover:text-red-600 border-t border-gray-100 mt-1"
            >
              Effacer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
