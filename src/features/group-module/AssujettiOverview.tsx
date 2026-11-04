import { ShieldAlert, Play, Plus } from 'lucide-react'
import type { SubsidiaryDetail } from './useSubsidiaryDetail'
import type { AssujettiRegProfile } from './useAssujettiProfile'

interface AssujettiOverviewProps {
  data: SubsidiaryDetail
  profile: AssujettiRegProfile | null
  onLaunch: () => void
}

const fmtDate = (d: string | null): string =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non renseigné'

function Tile({ label, value, note }: { label: string; value: string; note: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-gray-500">{label}</p>
      <p className="mt-0.5 text-[26px] font-extrabold tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-[12px] text-gray-400">{note}</p>
    </div>
  )
}

/** Onglet « Vue d'ensemble » du dossier d'assujetti : synthèse entity-scoped. */
export function AssujettiOverview({ data, profile, onLaunch }: AssujettiOverviewProps): JSX.Element {
  const refs = Array.from(new Set(data.missions.map((m) => m.framework_name).filter(Boolean) as string[]))
  // Seules les missions clôturées alimentent la conformité publiée par référentiel :
  // une mission en cours a un score partiel, non probant.
  const refScore = (name: string): number | null => {
    const scores = data.missions
      .filter((m) => m.framework_name === name && m.status === 'closure' && m.conformityScore !== null)
      .map((m) => m.conformityScore as number)
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  }

  return (
    <div className="space-y-4">
      {data.missions.length === 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gold-500/40 bg-gold-50 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-500/20 text-gold-600"><ShieldAlert size={22} /></span>
          <div className="min-w-[220px] flex-1">
            <b className="text-[14.5px] text-gray-900">Cet assujetti n&apos;a jamais été contrôlé.</b>
            <p className="mt-0.5 text-[13px] text-gray-500">Lancez un premier contrôle sur le référentiel applicable pour établir sa conformité initiale.</p>
          </div>
          <button type="button" onClick={onLaunch} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-forest-700 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-forest-900">
            <Play size={14} /> Lancer le premier contrôle
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Tile label="Missions actives" value={String(data.totalActiveMissions)} note="sur cet assujetti" />
        <Tile label="Contrôles évalués" value={String(data.totalEvaluatedControls)} note="tous référentiels" />
        <Tile label="Plans d'action ouverts" value={String(data.openCars)} note={data.overdueCars > 0 ? `${data.overdueCars} en retard` : 'aucun en retard'} />
        <Tile label="Prochaine échéance" value={data.nextReviewDate ? fmtDate(data.nextReviewDate) : '-'} note={data.nextReviewDate ? 'cycle de revue' : 'aucun cycle ouvert'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3"><h3 className="text-sm font-bold text-gray-900">Profil réglementaire</h3></div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 px-4 py-4 text-[13.5px]">
            <dt className="text-gray-500">Nature</dt><dd className="m-0 text-right font-semibold text-gray-900">{profile?.entityType ?? 'Non renseigné'}</dd>
            <dt className="text-gray-500">Secteur</dt><dd className="m-0 text-right font-semibold text-gray-900">{data.sector ?? 'Non renseigné'}</dd>
            <dt className="text-gray-500">Criticité</dt><dd className="m-0 text-right font-semibold text-gray-900">{profile?.criticality === 'eleve' ? 'Élevée (IIC)' : 'Standard'}</dd>
            <dt className="text-gray-500">Référentiels</dt><dd className="m-0 text-right font-semibold text-gray-900">{refs.length ? refs.join(', ') : 'Aucun'}</dd>
            <dt className="text-gray-500">Région</dt><dd className="m-0 text-right font-semibold text-gray-900">{[data.city, data.country].filter(Boolean).join(', ') || 'Non renseigné'}</dd>
            <dt className="text-gray-500">Assujetti depuis</dt><dd className="m-0 text-right font-semibold text-gray-900">{fmtDate(profile?.entryDate ?? null)}</dd>
            <dt className="text-gray-500">Régime</dt><dd className="m-0 text-right font-semibold text-gray-900">{profile?.obligationRegime ?? 'Non renseigné'}</dd>
          </dl>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900">Conformité par référentiel</h3>
              <p className="mt-0.5 text-[11.5px] text-gray-400">Missions clôturées uniquement</p>
            </div>
            <div className="px-4 py-3">
              {refs.length === 0 ? (
                <p className="text-[13px] text-gray-400">Aucun référentiel évalué pour l&apos;instant.</p>
              ) : refs.map((r) => {
                const s = refScore(r)
                return (
                  <div key={r} className="flex items-center justify-between border-b border-dashed border-gray-100 py-2 last:border-0">
                    <span className="text-[13.5px] font-semibold text-gray-900">{r}</span>
                    <span className={`text-[12.5px] font-bold ${s === null ? 'text-gold-600' : 'text-gray-700'}`}>{s === null ? 'À évaluer' : `${s}%`}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3"><h3 className="text-sm font-bold text-gray-900">Chronologie</h3></div>
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-100 text-forest-700"><Plus size={13} /></span>
                <div><b className="text-[13.5px] text-gray-900">Assujetti enregistré</b><p className="text-[12px] text-gray-400">{fmtDate(profile?.entryDate ?? null)}</p></div>
              </div>
              {data.missions.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500"><Play size={12} /></span>
                  <div><b className="text-[13.5px] text-gray-900">{m.name}</b><p className="text-[12px] text-gray-400">{m.start_date ? fmtDate(m.start_date) : 'Date non définie'}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
