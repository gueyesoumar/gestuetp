import { useMemo, useState } from 'react'
import { useSupervisedRegister, type SupervisedRisk } from './useSupervisedPortfolio'
import { useSupervisorDirectives } from './useSupervisorDirectives'
import { useVocab } from '../edition/useVocab'
import { useToast } from '../../hooks/useToast'
import { RequestActionPanel } from './RequestActionPanel'
import { IicBadge } from './riskLabels'
import { Pagination, pageSlice } from '../../components/ui/Pagination'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

const PAGE = 12

/** Revues des assujettis supervisés (#10) : échéances en retard / à venir, lecture + demande d'action. */
export function SupervisedReviews(): JSX.Element {
  const { rows, loading, error } = useSupervisedRegister()
  const dir = useSupervisorDirectives()
  const vocab = useVocab()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [onlyDue, setOnlyDue] = useState(true)
  const [requestFor, setRequestFor] = useState<SupervisedRisk | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const withReview = useMemo(() => {
    const r = rows.filter((x) => x.next_review_at)
    const scoped = onlyDue ? r.filter((x) => (x.next_review_at as string) <= today) : r
    return [...scoped].sort((a, b) => (a.next_review_at as string).localeCompare(b.next_review_at as string))
  }, [rows, onlyDue, today])

  const submit = async (d: string): Promise<void> => {
    if (!requestFor || !d.trim()) return
    const res = await dir.request(requestFor.id, d.trim())
    if (res.ok) { toast.success(`Demande envoyée à l'${vocab.entitySingular}`); setRequestFor(null) }
    else toast.error('Demande impossible', { description: res.error })
  }

  if (error) return <ErrorAlert message={error} />
  if (loading) return <LoadingSpinner />
  const overdue = rows.filter((x) => x.next_review_at && (x.next_review_at as string) < today).length
  const pageRows = pageSlice(withReview, page, PAGE)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] text-gray-500">{overdue > 0 ? `${overdue} revue${overdue > 1 ? 's' : ''} en retard chez vos ${vocab.entityPlural}.` : `Aucune revue en retard chez vos ${vocab.entityPlural}.`}</p>
        <label className="inline-flex items-center gap-2 text-[12px] text-gray-600"><input type="checkbox" checked={onlyDue} onChange={(e) => { setOnlyDue(e.target.checked); setPage(1) }} className="rounded border-gray-300 text-forest-600 focus:ring-forest-500" /> À échéance uniquement</label>
      </div>

      {requestFor && <RequestActionPanel label={`${requestFor.org_name} · ${requestFor.title}`} dimension={requestFor.dimension} onSubmit={submit} onCancel={() => setRequestFor(null)} />}

      {withReview.length === 0 ? (
        <EmptyState title="Aucune revue à suivre" description={`Aucun risque supervisé avec une échéance de revue ${onlyDue ? 'dépassée' : 'planifiée'}.`} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500"><tr>
              <th className="text-left px-4 py-3 font-semibold">{vocab.entitiesTitle}</th>
              <th className="text-left px-4 py-3 font-semibold">Risque</th>
              <th className="text-left px-4 py-3 font-semibold">Prochaine revue</th>
              <th className="text-left px-4 py-3 font-semibold">État</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((r) => {
                const over = (r.next_review_at as string) < today
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-gray-900 font-medium">{r.org_name} <IicBadge iic={r.org_is_iic} /></span></td>
                    <td className="px-4 py-3 text-gray-700">{r.title}</td>
                    <td className="px-4 py-3 text-gray-500">{r.next_review_at}</td>
                    <td className="px-4 py-3">{over ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700">En retard</span> : <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-50 text-green-700">À jour</span>}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setRequestFor(r)} className="text-[12px] font-semibold text-forest-700 hover:underline whitespace-nowrap">Demander une action</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination total={withReview.length} page={page} pageSize={PAGE} onPage={setPage} />
        </div>
      )}
    </div>
  )
}
