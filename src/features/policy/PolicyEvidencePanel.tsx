import { FileCheck } from 'lucide-react'
import { useControlPolicies } from './useControlPolicies'
import type { PolicyEvidenceStrength } from '../../lib/constants'

const STRENGTH: Record<PolicyEvidenceStrength, { label: string; color: string }> = {
  strong: { label: 'preuve forte', color: '#2E9E6B' },
  weak: { label: 'preuve faible', color: '#B8891F' },
  none: { label: 'non probante', color: '#94A3B8' },
}

/** Surface les politiques liées à un contrôle comme preuve candidate graduée.
 *  Lecture seule : la conformité reste la décision de l'auditeur. */
export function PolicyEvidencePanel({ controlId }: { controlId: string | null }): JSX.Element | null {
  const { policies, loading } = useControlPolicies(controlId)
  if (loading || policies.length === 0) return null

  return (
    <div className="border-t border-gray-100 px-3 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <FileCheck size={13} className="text-[#6D5AE6]" />
        <h4 className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Politiques · preuve candidate</h4>
      </div>
      <ul className="space-y-1.5">
        {policies.map((p) => {
          const s = STRENGTH[p.strength]
          return (
            <li key={p.id} className="flex items-start gap-2 text-[12px]">
              <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="flex-1 leading-snug">
                <span className="text-gray-700">{p.title}</span>
                <span className="ml-1.5 font-semibold" style={{ color: s.color }}>· {s.label}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="text-[10px] text-gray-400 mt-2 leading-snug">Preuve <b>forte</b> = approuvée <i>et</i> appliquée. La conformité du contrôle reste votre décision.</p>
    </div>
  )
}
