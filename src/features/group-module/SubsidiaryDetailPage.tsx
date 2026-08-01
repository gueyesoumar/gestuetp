import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSubsidiaryDetail } from './useSubsidiaryDetail'
import { SubsidiaryHero } from './SubsidiaryHero'
import { SubsidiaryKPIs } from './SubsidiaryKPIs'
import { SubsidiaryMissionsList } from './SubsidiaryMissionsList'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useVocab } from '../edition/useVocab'
import { useIsRegul } from '../edition/useIsRegul'
import { AssujettiInviteModal } from '../../regul/AssujettiInviteModal'

export function SubsidiaryDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const vocab = useVocab()
  const isRegul = useIsRegul()
  const { data, loading, error } = useSubsidiaryDetail(id)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (loading) return <LoadingSpinner />
  if (error || !data) return <ErrorAlert message={error ?? `${vocab.entitySingular} introuvable`} />

  return (
    <div className="space-y-5">
      <Link to={vocab.entityRouteBase} className="text-[13px] text-forest-700 hover:text-forest-900">
        &larr; Retour aux {vocab.entityPlural}
      </Link>

      <SubsidiaryHero data={data} />
      <SubsidiaryKPIs data={data} />

      {isRegul && (
        <section className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Portail assujetti</h3>
            <p className="text-[12px] text-gray-500 mt-0.5">Donnez à un contact de cet assujetti l&apos;accès cloisonné à une mission de contrôle.</p>
          </div>
          <button onClick={() => setInviteOpen(true)} className="px-3.5 py-2 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 transition-colors shrink-0">
            Gérer les accès
          </button>
        </section>
      )}

      {inviteOpen && (
        <AssujettiInviteModal
          entityOrgId={data.id}
          entityName={data.name}
          missions={data.missions.map((m) => ({ id: m.id, name: m.name }))}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => { /* liste rafraîchie dans le modal */ }}
        />
      )}

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
