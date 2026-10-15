import { useState } from 'react'
import { History } from 'lucide-react'
import { useRiskReviews } from './useRiskReview'
import { RISK_REVIEW_DECISIONS } from '../../lib/constants'
import type { RiskReviewDecision } from '../../types/database.types'

const decisionLabel = (v: string): string => RISK_REVIEW_DECISIONS.find((d) => d.value === v)?.label ?? v

/** Mini-courbe du résiduel à partir des revues (+ point live courant). */
function Sparkline({ values }: { values: number[] }): JSX.Element | null {
  if (values.length < 2) return null
  const W = 220, H = 36, max = 100
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (Math.min(v, max) / max) * H}`).join(' ')
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-1">
      <polyline fill="none" stroke="#2f7355" strokeWidth={2} points={pts} />
    </svg>
  )
}

/** Revue & historisation d'un scénario (RFC 0017 Lot 4). */
export function ScenarioReviewSection({ scenarioId, residual, inherent, nextReviewAt }: {
  scenarioId: string; residual: number; inherent: number; nextReviewAt: string | null
}): JSX.Element {
  const { reviews, logReview } = useRiskReviews(scenarioId)
  const [decision, setDecision] = useState<RiskReviewDecision>('maintain')
  const [notes, setNotes] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const trend = [...reviews.map((r) => r.residual_level).filter((v): v is number => v != null), residual]
  const today = new Date().toISOString().slice(0, 10)
  const overdue = !!nextReviewAt && nextReviewAt < today

  const submit = async (): Promise<void> => {
    setBusy(true)
    const ok = await logReview({ decision, residual_level: residual, inherent_level: inherent, notes: notes.trim() || null })
    setBusy(false)
    if (ok) { setOpen(false); setNotes(''); setDecision('maintain') }
  }

  return (
    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <History size={14} className="text-forest-700" />
        <h4 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Revue &amp; historique</h4>
        {nextReviewAt && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${overdue ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{overdue ? 'En retard' : 'Prochaine'} : {nextReviewAt}</span>}
      </div>

      <Sparkline values={trend} />

      {reviews.length > 0 ? (
        <ul className="space-y-1 my-2">
          {[...reviews].reverse().slice(0, 4).map((r) => (
            <li key={r.id} className="text-[12px] text-gray-600">
              <span className="font-mono text-[11px] text-gray-400">{r.reviewed_at.slice(0, 10)}</span> · {decisionLabel(r.decision)}
              {r.residual_level != null && <span className="text-gray-400"> · résiduel {r.residual_level}</span>}
              {r.notes && <span className="text-gray-400"> · {r.notes}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="text-[12px] text-gray-400 my-2">Aucune revue enregistrée.</p>}

      {!open ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">Enregistrer une revue</button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-gray-500">Décision</label>
            <select value={decision} onChange={(e) => setDecision(e.target.value as RiskReviewDecision)} className="border border-gray-200 rounded-lg px-2 py-1 text-[12px]">
              {RISK_REVIEW_DECISIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <span className="text-[11px] text-gray-400">résiduel figé : {residual}</span>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes de revue (facultatif)" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px]" />
          <div className="flex gap-2">
            <button onClick={() => void submit()} disabled={busy} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">Enregistrer</button>
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-[12px] text-gray-500">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}
