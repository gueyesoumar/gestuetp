import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useSubsidiaryDetail } from './useSubsidiaryDetail'
import { useAssujettiProfile } from './useAssujettiProfile'
import { AssujettiHero } from './AssujettiHero'
import { AssujettiOverview } from './AssujettiOverview'
import { SubsidiaryMissionsList } from './SubsidiaryMissionsList'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { AssujettiInviteModal } from '../regul/AssujettiInviteModal'
import { ReviewCyclesCard } from '../regul/review/ReviewCyclesCard'

type Tab = 'apercu' | 'controles' | 'revues' | 'contacts'

/**
 * Dossier d'assujetti (Regul) - vue 360° à onglets. Page dédiée, distincte de
 * SubsidiaryDetailPage (/filiales, Comply) pour ne pas diverger. Lot 1 : Vue
 * d'ensemble + Contrôles + Revues + Contacts (Constats/Plans/Incidents à venir).
 */
export function AssujettiDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, loading, error } = useSubsidiaryDetail(id)
  const { profile } = useAssujettiProfile(id)
  const [tab, setTab] = useState<Tab>('apercu')
  const [inviteOpen, setInviteOpen] = useState(false)

  if (loading) return <LoadingSpinner />
  if (error || !data) return <ErrorAlert message={error ?? 'Assujetti introuvable'} />

  const launch = (): void => { navigate('/controles/nouvelle', { state: { assujettiId: data.id } }) }
  const frameworks = Array.from(new Map(
    data.missions.filter((m) => m.framework_id && m.framework_name).map((m) => [m.framework_id as string, { id: m.framework_id as string, name: m.framework_name as string }]),
  ).values())

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'apercu', label: "Vue d'ensemble" },
    { key: 'controles', label: 'Contrôles', count: data.missions.length },
    { key: 'revues', label: 'Revues', count: data.cycles.length },
    { key: 'contacts', label: 'Contacts & accès' },
  ]

  return (
    <div className="space-y-5">
      <Link to="/assujettis" className="text-[13px] text-forest-700 hover:text-forest-900">&larr; Retour aux assujettis</Link>
      <AssujettiHero data={data} profile={profile} onLaunch={launch} />

      <div className="flex flex-wrap gap-5 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-[13px] font-medium transition-colors ${tab === t.key ? 'border-gold-500 text-forest-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-gray-100 px-2 text-[11px] font-mono text-gray-500">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'apercu' && <AssujettiOverview data={data} profile={profile} onLaunch={launch} />}

      {tab === 'controles' && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Contrôles</h3>
            <button onClick={launch} className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-3 py-2 text-xs font-semibold text-white hover:bg-forest-900">
              <Plus size={15} /> Nouveau contrôle
            </button>
          </div>
          <SubsidiaryMissionsList missions={data.missions} />
        </section>
      )}

      {tab === 'revues' && <ReviewCyclesCard orgId={data.id} frameworks={frameworks} />}

      {tab === 'contacts' && (
        <section className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Portail assujetti</h3>
            <p className="mt-0.5 text-[12px] text-gray-500">Ajoutez des contacts de cet assujetti, avec ou sans mission en cours, et donnez-leur l&apos;accès cloisonné à une mission de contrôle.</p>
          </div>
          <button onClick={() => setInviteOpen(true)} className="shrink-0 rounded-lg bg-forest-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-forest-900">
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
    </div>
  )
}
