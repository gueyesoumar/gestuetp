import type { CarRow } from './useAssujettiRemediation'
import { classOf, CAR_STATUS_LABEL, CAR_VERIF_LABEL } from './remediationLabels'

const today = new Date().toISOString().slice(0, 10)
const isOverdue = (c: CarRow): boolean => c.status !== 'closed' && c.status !== 'verified' && c.due !== null && c.due < today

/** Onglet « Plans d'action » du dossier d'assujetti : CAR de mission + manuelles. */
export function AssujettiPlans({ cars }: { cars: CarRow[] }): JSX.Element {
  if (cars.length === 0) {
    return <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-[13.5px] text-gray-400">Aucun plan d&apos;action pour cet assujetti.</div>
  }
  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {cars.map((c) => {
        const cl = classOf(c.classification)
        const overdue = isOverdue(c)
        return (
          <div key={c.id} className="flex items-start gap-3 p-4">
            <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${cl.cls}`}>{cl.label}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-semibold text-gray-700">{c.code}</span>
                {c.controlCode && <span className="text-[12px] text-gray-400">Contrôle {c.controlCode}</span>}
              </div>
              <p className="mt-1 text-[13.5px] text-gray-900">{c.description}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">{CAR_STATUS_LABEL[c.status] ?? c.status}</span>
                <span className="text-gray-500">Vérification : {CAR_VERIF_LABEL[c.verificationStatus] ?? c.verificationStatus}</span>
                {overdue && <span className="rounded-md bg-red-50 px-2 py-0.5 font-bold text-red-700">En retard</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
