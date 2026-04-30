import { Link } from 'react-router-dom'
import { KpiCard } from './KpiCard'
import { useAuth } from '../../hooks/useAuth'
import { useSubsidiaries } from '../group-module/useSubsidiaries'
import { SubsidiaryCard } from '../group-module/SubsidiaryCard'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

export function GroupeDashboard(): JSX.Element {
  const { profile } = useAuth()
  const { subsidiaries, loading, totalCount, averageScore, totalActiveMissions, totalOverdue } = useSubsidiaries()

  if (loading) return <LoadingSpinner />

  const fmt = (n: number | null): string => n === null ? '—' : `${n}`
  const fmtPct = (n: number | null): string => n === null ? '—' : `${n}%`

  return (
    <div>
      <div className="rounded-[14px] bg-gradient-to-br from-gray-900 to-forest-900 px-7 py-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{profile?.first_name ? `Groupe ${profile.first_name}` : 'Vue Groupe'}</h3>
          <p className="mt-1 text-[13px] text-white/50">Vue consolidée de la conformité des filiales</p>
        </div>
        <Link to="/filiales" className="text-[12px] text-white/80 hover:text-white bg-white/10 hover:bg-white/15 px-4 py-1.5 rounded-lg transition-colors">
          Voir les filiales →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3.5">
        <KpiCard label="Filiales" value={fmt(totalCount)} sub={totalCount > 0 ? `${totalCount} entité${totalCount > 1 ? 's' : ''} rattachée${totalCount > 1 ? 's' : ''}` : 'Aucune filiale'} variant="forest" />
        <KpiCard label="Score moyen" value={fmtPct(averageScore)} sub={averageScore !== null ? 'Toutes filiales pondérées' : 'En attente de données'} variant="gold" />
        <KpiCard label="Missions actives" value={fmt(totalActiveMissions)} sub={totalActiveMissions > 0 ? `Sur ${totalCount} filiale${totalCount > 1 ? 's' : ''}` : 'Aucune mission active'} variant="forest" />
        <KpiCard label="Plans en retard" value={fmt(totalOverdue)} sub={totalOverdue > 0 ? 'À traiter en priorité' : 'Aucun retard'} variant={totalOverdue > 0 ? 'error' : 'neutral'} />
      </div>

      {subsidiaries.length > 0 ? (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Conformité par filiale</h3>
            <Link to="/filiales" className="text-[12px] font-semibold text-forest-700 hover:text-forest-900">
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {subsidiaries.slice(0, 6).map((s) => <SubsidiaryCard key={s.id} subsidiary={s} />)}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-[14px] font-semibold text-gray-700">Aucune filiale rattachée</p>
          <p className="mt-2 text-[12px] text-gray-500">
            Pour activer la supervision groupe, créez vos filiales en les rattachant à votre organisation parente.
          </p>
        </div>
      )}
    </div>
  )
}
