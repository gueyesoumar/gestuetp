import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ShieldAlert, ClipboardCheck, Siren, ArrowRight } from 'lucide-react'
import { useSubsidiaries } from '../features/group-module/useSubsidiaries'
import { useAuth } from '../hooks/useAuth'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

/** Tableau de bord Gëstu Regul. Lot 1 : KPIs du registre (M1) réels + tuiles à venir. */
export function RegulDashboard(): JSX.Element {
  const { profile } = useAuth()
  const { subsidiaries, loading, totalCount } = useSubsidiaries()

  const oivCount = useMemo(
    () => subsidiaries.filter((s) => s.regulatoryProfile?.criticality === 'oiv').length,
    [subsidiaries],
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour{profile ? `, ${profile.first_name}` : ''}</h1>
        <p className="mt-1 text-[14px] text-gray-500">Vue d&apos;ensemble de la supervision du parc régulé.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link to="/assujettis" className="group rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <Building2 size={20} className="text-forest-700" />
            <ArrowRight size={15} className="text-gray-300 group-hover:text-forest-700 transition" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{totalCount}</p>
          <p className="text-[12px] text-gray-500">Assujettis recensés</p>
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <ShieldAlert size={20} className="text-red-600" />
          <p className="mt-3 text-3xl font-bold text-gray-900">{oivCount}</p>
          <p className="text-[12px] text-gray-500">dont OIV</p>
        </div>

        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-5">
          <ClipboardCheck size={20} className="text-gray-300" />
          <p className="mt-3 text-3xl font-bold text-gray-300">—</p>
          <p className="text-[12px] text-gray-400">Missions de contrôle <span className="text-gold-600 font-semibold">(bientôt)</span></p>
        </div>

        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-5">
          <Siren size={20} className="text-gray-300" />
          <p className="mt-3 text-3xl font-bold text-gray-300">—</p>
          <p className="text-[12px] text-gray-400">Incidents déclarés <span className="text-gold-600 font-semibold">(bientôt)</span></p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Prochaines briques</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Le pilotage stratégique (heatmap de maturité par secteur, taux de remédiation, reporting institutionnel)
          arrivera avec le module M8. Le cœur régulateur — constats, mesures graduées et notification probante — suit en M4.
        </p>
      </div>
    </div>
  )
}
