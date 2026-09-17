import { useEffect } from 'react'
import { getMissionPhases } from './mission-constants'
import { useWorkflowTemplates } from '../organization-settings/useWorkflowTemplates'

/**
 * Sélecteur de template de parcours à la création de mission (RFC 0009 phase 2).
 * Pré-sélectionne le template par défaut de l'org. Si aucun template n'existe,
 * n'affiche qu'une note (la mission suit alors le parcours complet).
 */
export function WorkflowTemplatePicker({ value, onChange }: { value: string; onChange: (id: string) => void }): JSX.Element | null {
  const { templates, loading } = useWorkflowTemplates()

  useEffect(() => {
    if (loading || templates.length === 0 || value) return
    const def = templates.find((t) => t.is_default) ?? templates[0]
    onChange(def.id)
  }, [loading, templates, value, onChange])

  if (loading) return null

  if (templates.length === 0) {
    return (
      <p className="text-[11.5px] text-gray-400">
        Parcours complet. Créez des templates dans <b className="text-gray-500">Organisation → Parcours</b> pour proposer des variantes.
      </p>
    )
  }

  const selected = templates.find((t) => t.id === value)
  const preview = getMissionPhases({ workflow_disabled_steps: selected?.disabled_steps ?? [] })

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (défaut)' : ''}</option>
        ))}
      </select>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {preview.map((p, i) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">&rarr;</span>}
            <span className="text-[11px] font-semibold text-forest-800 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
