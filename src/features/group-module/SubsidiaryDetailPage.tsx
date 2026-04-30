import { Link, useParams } from 'react-router-dom'
import { useSubsidiaryDetail } from './useSubsidiaryDetail'
import { SubsidiaryHero } from './SubsidiaryHero'
import { SubsidiaryKPIs } from './SubsidiaryKPIs'
import { SubsidiaryMissionsList } from './SubsidiaryMissionsList'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

export function SubsidiaryDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error } = useSubsidiaryDetail(id)

  if (loading) return <LoadingSpinner />
  if (error || !data) return <ErrorAlert message={error ?? 'Filiale introuvable'} />

  return (
    <div className="space-y-5">
      <Link to="/filiales" className="text-[13px] text-forest-700 hover:text-forest-900">
        &larr; Retour aux filiales
      </Link>

      <SubsidiaryHero data={data} />
      <SubsidiaryKPIs data={data} />

      <section>
        <h3 className="text-base font-bold text-gray-900 mb-3">Missions</h3>
        <SubsidiaryMissionsList missions={data.missions} />
      </section>

      {data.scoreTrend.length > 0 && (
        <section>
          <h3 className="text-base font-bold text-gray-900 mb-3">Tendance du score</h3>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-end gap-3 h-32">
              {data.scoreTrend.map((t) => {
                const h = Math.max(8, (t.score / 100) * 100)
                const color = t.score >= 80 ? 'bg-green-500' : t.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div key={t.label} className="flex-1 flex flex-col items-center">
                    <div className="text-[11px] font-bold text-gray-700 mb-1">{t.score}%</div>
                    <div className={`w-full rounded-t ${color}`} style={{ height: `${h}%` }} />
                    <div className="text-[10px] text-gray-500 mt-1.5">{t.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
