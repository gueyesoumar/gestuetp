import { Lightbulb, FileText, MessageCircle, Eye, FlaskConical, CheckCircle2 } from 'lucide-react'
import type { AuditChecklistItem } from '../../../../types/database.types'
import type { CadrageAnswer } from '../right-rail/useControlContext'

interface AuditChecklistTipProps {
  controlCode: string
  controlName: string
  items: AuditChecklistItem[]
  cadrageAnswers?: CadrageAnswer[]
  clientName?: string | null
}

const EVIDENCE_CFG: Record<string, { icon: typeof FileText; title: string }> = {
  document: { icon: FileText, title: 'Preuve documentaire' },
  interview: { icon: MessageCircle, title: 'Entretien' },
  observation: { icon: Eye, title: 'Observation terrain' },
  test: { icon: FlaskConical, title: 'Test technique' },
}

function formatResponse(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ')
  if (typeof value === 'string') return value.trim() || '—'
  if (typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

export function AuditChecklistTip({ controlCode, controlName, items, cadrageAnswers, clientName }: AuditChecklistTipProps) {
  const hasStatic = items.length > 0
  const hasDynamic = (cadrageAnswers ?? []).length > 0
  if (!hasStatic && !hasDynamic) return null

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

        {hasStatic && (
          <>
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
          </>
        )}

        {hasDynamic && (
          <div className={hasStatic ? 'mt-2 pt-2 border-t border-dashed border-gold-300' : ''}>
            <p className="text-[10px] uppercase tracking-wide font-bold text-forest-700 mb-1.5 flex items-center gap-1">
              <CheckCircle2 size={11} />
              À vérifier d&apos;après le cadrage{clientName ? ` ${clientName}` : ''}
            </p>
            <ul className="space-y-1">
              {(cadrageAnswers ?? []).map((ans) => (
                <li key={ans.question_id} className="text-[11.5px] text-gray-700 leading-snug flex items-start gap-1.5">
                  <span className="text-forest-600 shrink-0">&middot;</span>
                  <span className="flex-1">
                    <strong className="font-mono text-[10px] text-forest-700">{ans.question_code}</strong>
                    {' '}&mdash; r&eacute;ponse : <strong className="text-gray-900">{formatResponse(ans.response_value)}</strong>
                    {ans.question_text && (
                      <span className="block text-gray-500 italic ml-2 mt-0.5">{ans.question_text}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
