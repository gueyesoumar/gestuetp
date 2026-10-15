import { History } from 'lucide-react'
import { useReviewsDue } from './useRiskReview'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

/** Revue & surveillance : échéances de revue et revues en retard (RFC 0017 Lot 4). */
export function RiskReviewPage(): JSX.Element {
  const { rows, loading, error } = useReviewsDue()
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const overdue = rows.filter((r) => r.overdue).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><History size={20} className="text-[#E07A5F]" /> Revue &amp; surveillance</h1>
        <p className="mt-1 text-[13px] text-gray-500">Échéances de revue des risques (ISO 27005 §10). {overdue > 0 ? `${overdue} revue${overdue > 1 ? 's' : ''} en retard.` : 'Aucune revue en retard.'} Ouvrez un scénario depuis le registre pour enregistrer une revue.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun scénario à surveiller" description="Les risques actifs et leurs échéances de revue apparaîtront ici." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Risque</th>
                <th className="text-left px-4 py-3 font-semibold">Dernière revue</th>
                <th className="text-left px-4 py-3 font-semibold">Prochaine</th>
                <th className="text-left px-4 py-3 font-semibold">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{r.title}</td>
                  <td className="px-4 py-3 text-gray-500">{r.last_reviewed_at ? r.last_reviewed_at.slice(0, 10) : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.next_review_at ?? '-'}</td>
                  <td className="px-4 py-3">
                    {!r.next_review_at
                      ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500">Jamais révisé</span>
                      : r.overdue
                        ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700">En retard</span>
                        : <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-50 text-green-700">À jour</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
