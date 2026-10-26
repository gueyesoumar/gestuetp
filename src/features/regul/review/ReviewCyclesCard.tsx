import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReviewCycles, reviewStatus } from './useReviewCycles'
import { useToast } from '../../../hooks/useToast'

const OPTIONS = [
  { v: '', l: 'Aucune (pas de revue)' },
  { v: '6', l: 'Tous les 6 mois' },
  { v: '12', l: 'Tous les 12 mois' },
  { v: '18', l: 'Tous les 18 mois' },
  { v: '24', l: 'Tous les 24 mois' },
]

const fmt = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'

/** Cycles de revue par référentiel d'un assujetti (n°18 Lot 1). Affiché en Regul. */
export function ReviewCyclesCard({ orgId, frameworks }: { orgId: string; frameworks: { id: string; name: string }[] }): JSX.Element | null {
  const { cycles, loading, setCadence, launchReview } = useReviewCycles(orgId)
  const toast = useToast()
  const navigate = useNavigate()
  const [launching, setLaunching] = useState<string | null>(null)
  if (frameworks.length === 0) return null

  const onChange = async (fwId: string, val: string): Promise<void> => {
    const r = await setCadence(fwId, val === '' ? null : Number(val))
    if (!r.ok) toast.error(r.error ?? 'Mise à jour impossible')
    else toast.success('Cadence de revue mise à jour')
  }

  const onLaunch = async (sourceMissionId: string): Promise<void> => {
    setLaunching(sourceMissionId)
    const r = await launchReview(sourceMissionId)
    setLaunching(null)
    const missionId = (r.data as { mission_id?: string } | undefined)?.mission_id
    if (r.ok && missionId) { toast.success('Contrôle de revue créé'); navigate(`/controles/${missionId}`) }
    else toast.error(r.error ?? 'Lancement impossible')
  }

  return (
    <section>
      <h3 className="mb-3 text-base font-bold text-gray-900">Cycles de revue par référentiel</h3>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {frameworks.map((fw) => {
          const c = cycles[fw.id]
          const st = reviewStatus(c?.next_review_at)
          return (
            <div key={fw.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-md bg-forest-50 px-2 py-0.5 font-mono text-[12px] font-semibold text-forest-700">{fw.name}</span>
                  <div className="mt-1.5 text-[12px] text-gray-500">Dernière revue : {fmt(c?.last_reviewed_at)}{c?.last_reviewed_at ? ' · contrôle clôturé' : ''}</div>
                </div>
                {st
                  ? <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>Prochaine : {fmt(c?.next_review_at)} · {st.label}</span>
                  : <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">Pas de cadence</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <select disabled={loading} value={c?.frequency_months != null ? String(c.frequency_months) : ''}
                  onChange={(e) => void onChange(fw.id, e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12.5px] disabled:opacity-50">
                  {OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                {c?.last_mission_id
                  ? <button type="button" disabled={launching === c.last_mission_id}
                      onClick={() => void onLaunch(c.last_mission_id!)}
                      className="rounded-lg bg-forest-700 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-forest-900 disabled:opacity-50">
                      {launching === c.last_mission_id ? 'Lancement en cours' : 'Lancer la revue'}
                    </button>
                  : <span className="text-[11.5px] text-gray-400">Lancement possible après un premier contrôle clôturé.</span>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
