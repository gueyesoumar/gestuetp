import type { FindingRow } from './useAssujettiRemediation'
import { classOf, PRIORITY_LABEL } from './remediationLabels'

/** Onglet « Constats » du dossier d'assujetti : écarts relevés lors des contrôles. */
export function AssujettiFindings({ findings }: { findings: FindingRow[] }): JSX.Element {
  if (findings.length === 0) {
    return <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-[13.5px] text-gray-400">Aucun constat pour cet assujetti.</div>
  }
  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {findings.map((f) => {
        const c = classOf(f.classification)
        return (
          <div key={f.id} className="flex items-start gap-3 p-4">
            <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${c.cls}`}>{c.label}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] text-gray-900">{f.description}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-500">
                {f.controlCode && <span>Contrôle {f.controlCode}</span>}
                {f.priority && <span>Priorité : {PRIORITY_LABEL[f.priority] ?? f.priority}</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
