import { Lightbulb, FileText, MessageCircle, Eye, FlaskConical } from 'lucide-react'
import type { AuditChecklistItem } from '../../../../types/database.types'

interface AuditChecklistTipProps {
  controlCode: string
  controlName: string
  items: AuditChecklistItem[]
}

const EVIDENCE_CFG: Record<string, { icon: typeof FileText; title: string }> = {
  document: { icon: FileText, title: 'Preuve documentaire' },
  interview: { icon: MessageCircle, title: 'Entretien' },
  observation: { icon: Eye, title: 'Observation terrain' },
  test: { icon: FlaskConical, title: 'Test technique' },
}

export function AuditChecklistTip({ controlCode, controlName, items }: AuditChecklistTipProps) {
  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-dashed border-gold-300 bg-gold-50/40 p-3 flex gap-3 items-start">
      <div className="w-7 h-7 rounded-md bg-gold-100 text-gold-700 flex items-center justify-center shrink-0">
        <Lightbulb size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gray-900 mb-1.5">
          Points d&apos;attention &middot; {controlCode}{' '}
          <span className="font-normal text-gray-500">{controlName}</span>
        </p>
        <p className="text-[10px] uppercase tracking-wide font-bold text-gold-700 mb-1.5">
          Checklist du contr&ocirc;le
        </p>
        <ul className="space-y-1">
          {items.map((item, idx) => {
            const cfg = item.evidence_type ? EVIDENCE_CFG[item.evidence_type] : null
            const Icon = cfg?.icon ?? null
            return (
              <li key={idx} className="text-[11.5px] text-gray-700 leading-snug flex items-start gap-1.5">
                <span className="text-gold-600 shrink-0">&middot;</span>
                <span className="flex-1">
                  {item.label}
                  {item.hint && (
                    <span className="text-gray-400 italic"> &mdash; {item.hint}</span>
                  )}
                  {Icon && cfg && (
                    <span className="inline-flex items-center gap-1 ml-1.5 px-1 py-0.5 rounded bg-white/60 border border-gold-200 text-[9px] text-gold-700" title={cfg.title}>
                      <Icon size={9} />
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
