import { Lightbulb, FileText, MessageCircle, Eye, FlaskConical, HelpCircle } from 'lucide-react'
import type { AuditChecklistItem } from '../../../../types/database.types'

interface AuditChecklistCardProps {
  items: AuditChecklistItem[]
}

const EVIDENCE_CFG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  document: { icon: FileText, label: 'Document', color: 'text-blue-600 bg-blue-50' },
  interview: { icon: MessageCircle, label: 'Entretien', color: 'text-purple-600 bg-purple-50' },
  observation: { icon: Eye, label: 'Observation', color: 'text-amber-600 bg-amber-50' },
  test: { icon: FlaskConical, label: 'Test', color: 'text-green-600 bg-green-50' },
}

export function AuditChecklistCard({ items }: AuditChecklistCardProps) {
  return (
    <div className="border border-gold-200 rounded-xl bg-gradient-to-br from-gold-50 to-white overflow-hidden">
      <div className="px-4 py-2.5 bg-gold-100/50 border-b border-gold-200 flex items-center gap-2">
        <Lightbulb size={14} className="text-gold-700" />
        <h5 className="text-[12px] font-semibold text-gold-900 flex-1">Points &agrave; v&eacute;rifier</h5>
        <span className="text-[10px] font-mono text-gold-700 bg-white/60 px-1.5 py-0.5 rounded">{items.length}</span>
      </div>

      <div className="p-3">
        {items.length === 0 ? (
          <div className="flex items-start gap-2 text-[11px] text-gray-400 italic">
            <HelpCircle size={13} className="mt-0.5 shrink-0" />
            <p>Pas de checklist normative pour ce contr&ocirc;le. Vous pouvez quand m&ecirc;me &eacute;valuer librement.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item, idx) => {
              const cfg = item.evidence_type ? EVIDENCE_CFG[item.evidence_type] : undefined
              const Icon = cfg?.icon ?? null
              return (
                <li key={idx} className="flex items-start gap-2 text-[11px] leading-snug">
                  <span className="text-gold-600 font-mono shrink-0 mt-0.5">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800">{item.label}</p>
                    {item.hint && (
                      <p className="mt-0.5 text-[10px] text-gray-500 italic">{item.hint}</p>
                    )}
                    {cfg && Icon && (
                      <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${cfg.color}`}>
                        <Icon size={9} /> {cfg.label}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
