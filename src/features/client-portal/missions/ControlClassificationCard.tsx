import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import type { FindingClassification } from '../../../types/database.types'

interface ClassifMeta {
  label: string
  color: string
  bg: string
  border: string
  icon: typeof AlertTriangle
  desc: string
}

export const CLASSIF_META: Record<FindingClassification | 'conforme', ClassifMeta> = {
  conforme:    { label: 'Conforme',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2,  desc: 'Ce contrôle a été validé par l’auditeur. La mesure est en place et documentée.' },
  observation: { label: 'Observation', color: '#B8922E', bg: '#FDF8E8', border: '#F2E2B1', icon: AlertTriangle, desc: 'Ce contrôle a une observation mineure. La mesure est en place mais des améliorations sont recommandées.' },
  minor_nc:    { label: 'NC mineure',  color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', icon: AlertTriangle, desc: 'Non-conformité mineure. La mesure est partiellement en place, des lacunes ont été identifiées.' },
  major_nc:    { label: 'NC majeure',  color: '#C0392B', bg: '#FDE8E8', border: '#FCA5A5', icon: AlertTriangle, desc: 'Non-conformité majeure. Action corrective prioritaire requise.' },
  strength:    { label: 'Point fort',  color: '#B8922E', bg: '#FEF9C3', border: '#D4A843', icon: Sparkles,      desc: 'Mise en œuvre exemplaire qui dépasse les exigences minimales.' },
}

/** Carte de classification d'un contrôle (extraite de ControlDetailDrawer, CLAUDE.md §2). */
export function ControlClassificationCard({ meta }: { meta: ClassifMeta }): JSX.Element {
  const Icon = meta.icon
  return (
    <div className="mb-5 p-3.5 rounded-lg border" style={{ background: meta.bg, borderColor: meta.border }}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={16} style={{ color: meta.color }} />
        <span className="text-[13px] font-bold" style={{ color: meta.color }}>{meta.label}</span>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: meta.color }}>{meta.desc}</p>
    </div>
  )
}
