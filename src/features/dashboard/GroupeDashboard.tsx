import { KpiCard } from './KpiCard'
import { useAuth } from '../../hooks/useAuth'

export function GroupeDashboard() {
  const { profile } = useAuth()

  // Pour V1, vue statique — les donnees viendront quand le module groupe sera implemente
  // Cette vue montre la structure et le design valide

  return (
    <div>
      {/* Welcome groupe */}
      <div className="rounded-[14px] bg-gradient-to-br from-gray-900 to-forest-900 px-7 py-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{profile?.first_name ? `Groupe ${profile.first_name}` : 'Vue Groupe'}</h3>
          <p className="mt-1 text-[13px] text-white/50">Vue consolid&eacute;e de la conformit&eacute; des filiales</p>
        </div>
        <div className="text-[12px] text-white/40 bg-white/10 px-4 py-1.5 rounded-lg">
          Vue consolid&eacute;e
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-4 gap-3.5">
        <KpiCard label="Filiales" value="\u2014" sub="Module groupe \u00e0 venir" variant="forest" />
        <KpiCard label="Score moyen" value="\u2014" sub="Toutes filiales" variant="gold" />
        <KpiCard label="Missions actives" value="\u2014" sub="Sur toutes les filiales" variant="forest" />
        <KpiCard label="Plans en retard" value="\u2014" sub="D\u00e9lai d\u00e9pass\u00e9" variant="neutral" />
      </div>

      {/* Placeholder cards */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <div className="text-[14px] font-semibold text-gray-400">Conformit&eacute; par filiale</div>
          <p className="mt-2 text-[12px] text-gray-300">
            Cartes filiales avec score en anneau, missions et retards.
            <br />Disponible avec le module Groupe.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <div className="text-[14px] font-semibold text-gray-400">Carte de conformit&eacute;</div>
          <p className="mt-2 text-[12px] text-gray-300">
            Heatmap domaines &times; filiales avec code couleur.
            <br />Disponible avec le module Groupe.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <div className="text-[14px] font-semibold text-gray-400">Plans d&apos;action</div>
          <p className="mt-2 text-[12px] text-gray-300">
            Suivi des plans d&apos;action par filiale avec statut et d&eacute;lais.
            <br />Disponible avec le module Groupe.
          </p>
        </div>
      </div>
    </div>
  )
}
