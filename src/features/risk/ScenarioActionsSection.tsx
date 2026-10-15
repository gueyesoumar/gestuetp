import { useState } from 'react'
import { Plus, Trash2, ListChecks } from 'lucide-react'
import { useRiskTreatmentActions } from './useRiskTreatment'
import { RISK_ACTION_STATUS } from '../../lib/constants'
import type { RiskActionStatus } from '../../types/database.types'

const NEXT: Record<RiskActionStatus, RiskActionStatus> = {
  todo: 'in_progress', in_progress: 'done', done: 'todo', cancelled: 'todo',
}
const statusCls: Record<RiskActionStatus, string> = {
  todo: 'bg-gray-100 text-gray-600', in_progress: 'bg-amber-50 text-amber-700',
  done: 'bg-green-50 text-green-700', cancelled: 'bg-gray-50 text-gray-400',
}
const statusLabel = (v: RiskActionStatus): string => RISK_ACTION_STATUS.find((s) => s.value === v)?.label ?? v

/** Plan de traitement d'un scénario : liste + ajout d'actions (RFC 0017 Lot 2). */
export function ScenarioActionsSection({ scenarioId }: { scenarioId: string }): JSX.Element {
  const { actions, loading, createAction, setStatus, deleteAction } = useRiskTreatmentActions(scenarioId)
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)

  const add = async (): Promise<void> => {
    const d = desc.trim()
    if (!d) return
    setBusy(true)
    const ok = await createAction({ description: d })
    setBusy(false)
    if (ok) setDesc('')
  }

  return (
    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <ListChecks size={14} className="text-forest-700" />
        <h4 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Plan de traitement</h4>
      </div>

      {!loading && actions.length === 0 && (
        <p className="text-[12px] text-gray-400 mb-3">Aucune action. Décrivez les actions qui réduisent ce risque.</p>
      )}

      {actions.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {actions.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-[12px]">
              <button onClick={() => void setStatus(a.id, NEXT[a.status])} title="Changer le statut"
                className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${statusCls[a.status]}`}>{statusLabel(a.status)}</button>
              <span className={`flex-1 ${a.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{a.description}</span>
              {a.origin === 'supervisor_directive' && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">Régulateur</span>}
              {a.due_date && <span className="text-[11px] text-gray-400 shrink-0">{a.due_date}</span>}
              <button onClick={() => void deleteAction(a.id)} className="text-gray-400 hover:text-red-600 shrink-0" aria-label="Supprimer"><Trash2 size={12} /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void add() }}
          placeholder="Nouvelle action de traitement..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px]" />
        <button onClick={() => void add()} disabled={busy || !desc.trim()}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
          <Plus size={14} /> Ajouter
        </button>
      </div>
    </div>
  )
}
