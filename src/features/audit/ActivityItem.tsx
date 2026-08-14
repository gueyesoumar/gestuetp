import { Lock } from 'lucide-react'
import { actorName, type ActivityRow } from './useActivityLog'

/** Famille (préfixe) → libellé + style de badge. */
export const FAMILY_META: Record<string, { label: string; badge: string }> = {
  organization: { label: 'Organisation', badge: 'bg-forest-50 text-forest-700' },
  org_logo: { label: 'Logo', badge: 'bg-forest-50 text-forest-700' },
  entity: { label: 'Assujetti', badge: 'bg-blue-50 text-blue-700' },
  mission: { label: 'Mission', badge: 'bg-amber-50 text-amber-700' },
  assessment: { label: 'Évaluation', badge: 'bg-purple-50 text-purple-700' },
  finding: { label: 'Constat', badge: 'bg-purple-50 text-purple-700' },
  role: { label: 'Rôle', badge: 'bg-red-50 text-red-700' },
  member: { label: 'Membre', badge: 'bg-red-50 text-red-700' },
  portal: { label: 'Portail', badge: 'bg-blue-50 text-blue-700' },
  measure: { label: 'Mesure', badge: 'bg-amber-50 text-amber-700' },
  incident: { label: 'Incident', badge: 'bg-red-50 text-red-700' },
  client: { label: 'Client', badge: 'bg-blue-50 text-blue-700' },
  action_plan: { label: 'Plan d’action', badge: 'bg-amber-50 text-amber-700' },
  vocab: { label: 'Terminologie', badge: 'bg-gray-100 text-gray-600' },
  mfa: { label: 'Sécurité', badge: 'bg-red-50 text-red-700' },
}

function familyOf(action: string): string {
  return action.split('.')[0]
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function ActivityItem({ row }: { row: ActivityRow }): JSX.Element {
  const fam = FAMILY_META[familyOf(row.action)] ?? { label: familyOf(row.action), badge: 'bg-gray-100 text-gray-600' }
  const changed = Array.isArray(row.metadata?.changed) ? (row.metadata.changed as string[]) : []
  return (
    <div className="flex items-start gap-3 border-t border-gray-100 py-3">
      <div className="w-36 shrink-0 text-[11px] text-gray-400 tabular-nums">{formatDateTime(row.occurred_at)}</div>
      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${fam.badge}`}>{fam.label}</span>
      {row.source === 'probative' && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-forest-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white" title="Acte scellé — registre à valeur probante (chaîné + horodaté)">
          <Lock size={9} /> Scellé
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-gray-900">
          {row.summary ?? row.action}
          {row.target_label && !row.summary?.includes(row.target_label) && <span className="text-gray-500"> · {row.target_label}</span>}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          {actorName(row)}
          <span className="ml-2 font-mono text-[10px] text-gray-400">{row.action}</span>
          {row.source === 'edge' && <span className="ml-1.5 text-[9px] text-gray-300">via serveur</span>}
        </p>
        {changed.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {changed.map((c) => <span key={c} className="rounded bg-gray-50 px-1.5 py-0.5 font-mono text-[9px] text-gray-500">{c}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}
