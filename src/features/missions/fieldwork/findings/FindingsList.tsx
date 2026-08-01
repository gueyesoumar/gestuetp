import { AlertTriangle, Sparkles } from 'lucide-react'
import { CLASSIFICATION_OPTIONS, PRIORITY_OPTIONS, getClassificationConfig } from './FindingPickers'
import type { AssessmentFinding } from '../../../../types/database.types'

interface FindingsListProps {
  findings: AssessmentFinding[]
  emptyMessage?: string
  density?: 'comfortable' | 'compact'
}

function formatDeadline(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function FindingsList({ findings, emptyMessage, density = 'comfortable' }: FindingsListProps): JSX.Element {
  if (findings.length === 0) {
    return (
      <p className="text-[12px] text-gray-400 italic">
        {emptyMessage ?? 'Aucun constat enregistré.'}
      </p>
    )
  }

  return (
    <div className={density === 'compact' ? 'space-y-2' : 'space-y-3'}>
      {findings.map((f, idx) => (
        <FindingReadOnlyCard key={f.id} finding={f} index={idx} compact={density === 'compact'} />
      ))}
    </div>
  )
}

function FindingReadOnlyCard({ finding, index, compact }: { finding: AssessmentFinding; index: number; compact: boolean }): JSX.Element {
  const classifCfg = getClassificationConfig(finding.classification)
  const classifLabel = CLASSIFICATION_OPTIONS.find((c) => c.value === finding.classification)?.label ?? finding.classification
  const priorityCfg = finding.priority ? PRIORITY_OPTIONS.find((p) => p.value === finding.priority) : null
  const isStrength = finding.classification === 'strength'

  return (
    <div className={`border rounded-xl bg-white overflow-hidden ${classifCfg.cardBorder}`}>
      <div className={`flex items-center gap-2 flex-wrap px-3 py-1.5 ${classifCfg.cardBg} border-b ${classifCfg.cardBorder}`}>
        <span className="font-mono text-[10px] font-bold tracking-wide text-gray-500">
          CONSTAT {String(index + 1).padStart(2, '0')}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${classifCfg.pillBg}`}>
          {classifLabel}
        </span>
        {priorityCfg && (
          <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded ${priorityCfg.color}`}>
            {priorityCfg.label}
          </span>
        )}
        {finding.ai_generated && (
          <span className="text-[9px] font-bold uppercase tracking-wide text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
            <Sparkles size={9} /> IA
          </span>
        )}
        {finding.proposed_deadline && !isStrength && (
          <span className="ml-auto text-[10px] text-gray-500">
            &Eacute;ch&eacute;ance : <span className="font-medium text-gray-700">{formatDeadline(finding.proposed_deadline)}</span>
          </span>
        )}
      </div>

      <div className={`px-3 ${compact ? 'py-2' : 'py-3'} space-y-${compact ? '2' : '3'}`}>
        <ReadOnlySection label="Constat" content={finding.description} />

        {!isStrength && finding.risk && (
          <ReadOnlySection
            label={<><AlertTriangle size={10} className="inline mb-0.5" /> Risque associ&eacute;</>}
            content={finding.risk}
            tone="warning"
          />
        )}

        {!isStrength && finding.recommendation && (
          <ReadOnlySection label="Recommandation" content={finding.recommendation} />
        )}

        {isStrength && (
          <p className="text-[10px] text-gray-400 italic">Point fort &mdash; pas de recommandation associ&eacute;e.</p>
        )}
      </div>
    </div>
  )
}

function ReadOnlySection({ label, content, tone }: { label: React.ReactNode; content: string; tone?: 'warning' }): JSX.Element {
  const baseClass = tone === 'warning'
    ? 'border border-amber-200 bg-amber-50/30'
    : 'border border-gray-200 bg-white'
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      <div className={`px-3 py-2 rounded-lg text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap ${baseClass}`}>
        {content}
      </div>
    </div>
  )
}
