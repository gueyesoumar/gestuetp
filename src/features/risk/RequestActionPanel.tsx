import { useState } from 'react'
import { RISK_DIRECTIVE_SUGGESTIONS } from '../../lib/constants'

interface Props {
  label: string
  dimension: string | null
  onSubmit: (description: string) => void | Promise<void>
  onCancel: () => void
}

/** Panneau « Demander une action » partagé : suggestions par dimension + saisie libre (#8). */
export function RequestActionPanel({ label, dimension, onSubmit, onCancel }: Props): JSX.Element {
  const [desc, setDesc] = useState('')
  const suggestions = dimension ? (RISK_DIRECTIVE_SUGGESTIONS[dimension] ?? []) : []

  return (
    <div className="rounded-xl border border-forest-200 bg-forest-50 p-4 space-y-2">
      <div className="text-[13px] font-semibold text-gray-900">Demander une action · <span className="font-normal">{label}</span></div>
      {suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setDesc(s)} className={`text-[11.5px] px-2 py-1 rounded-full border text-left ${desc === s ? 'border-forest-600 bg-forest-100 text-forest-800' : 'border-forest-200 bg-white text-forest-700 hover:bg-forest-100'}`}>{s}</button>
            ))}
          </div>
        </div>
      )}
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Action demandée (choisissez une suggestion ci-dessus ou saisissez librement)" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px]" />
      <div className="flex gap-2">
        <button onClick={() => void onSubmit(desc)} disabled={!desc.trim()} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">Envoyer la demande</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-[12px] text-gray-500">Annuler</button>
      </div>
    </div>
  )
}
