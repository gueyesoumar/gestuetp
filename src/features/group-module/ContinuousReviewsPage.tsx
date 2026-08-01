import { Link } from 'react-router-dom'
import { useContinuousReviews } from './useContinuousReviews'
import { useCloseCycle } from './useCloseCycle'
import { CycleTimeline } from './CycleTimeline'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'

export function ContinuousReviewsPage(): JSX.Element {
  const { missions, loading, reload } = useContinuousReviews()
  const { busy, closeCycle } = useCloseCycle(reload)

  if (loading) return <LoadingSpinner />

  if (missions.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Revues continues</h2>
        <p className="mt-1 text-[13px] text-gray-500">Cycles trimestriels actifs sur l&apos;ensemble des filiales.</p>
        <div className="mt-8">
          <EmptyState
            title="Aucune supervision continue"
            description="Pour démarrer une supervision continue, créez une mission de type « Supervision continue » sur l'une de vos filiales."
            action={
              <Link to="/missions/nouvelle"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-800">
                + Nouvelle supervision
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Revues continues</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            {missions.length} supervision{missions.length > 1 ? 's' : ''} continue{missions.length > 1 ? 's' : ''} active{missions.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {missions.map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Link to={`/missions/${m.id}`} className="font-bold text-gray-900 hover:text-forest-700">
                  {m.name}
                </Link>
                <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                  {m.subsidiary_id && (
                    <Link to={`/filiales/${m.subsidiary_id}`} className="hover:text-forest-700 hover:underline">
                      {m.subsidiary_name}
                    </Link>
                  )}
                  {m.framework_name && <span>· {m.framework_name}</span>}
                  {m.lead_auditor_name && <span>· Lead : {m.lead_auditor_name}</span>}
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                Supervision continue
              </span>
            </div>

            <CycleTimeline
              cycles={m.cycles}
              onClose={closeCycle}
              busy={busy}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
