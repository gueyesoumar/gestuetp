import { getMissionPhases } from '../missions/mission-constants'
import { WORKFLOW_STEP_GROUPS, ALL_DESELECTABLE_KEYS } from './workflowStepCatalog'

interface Props {
  name: string
  onChangeName: (v: string) => void
  isDefault: boolean
  onChangeDefault: (v: boolean) => void
  included: Set<string>
  onToggleStep: (key: string) => void
  saving: boolean
  isEditing: boolean
  onSubmit: () => void
  onCancel: () => void
}

/** Formulaire contrôlé d'un template de parcours (RFC 0009 phase 2). */
export function WorkflowTemplateForm(props: Props): JSX.Element {
  const { name, onChangeName, isDefault, onChangeDefault, included, onToggleStep, saving, isEditing, onSubmit, onCancel } = props
  const disabledKeys = ALL_DESELECTABLE_KEYS.filter((k) => !included.has(k))
  const previewPhases = getMissionPhases({ workflow_disabled_steps: disabledKeys })
  const includedScoping = WORKFLOW_STEP_GROUPS.flatMap((g) => g.steps)
    .filter((s) => s.key.startsWith('scoping.') && included.has(s.key)).map((s) => s.label)

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="max-w-2xl space-y-5">
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Nom du template</label>
        <input
          type="text" value={name} onChange={(e) => onChangeName(e.target.value)} disabled={saving}
          placeholder="Ex. Mission allégée, Contrôle rapide…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px]"
        />
      </div>

      {WORKFLOW_STEP_GROUPS.map((group) => (
        <div key={group.title}>
          <h4 className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold mb-2">{group.title}</h4>
          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {group.steps.map((step) => (
              <label key={step.key} className="flex items-center justify-between gap-4 py-2.5 cursor-pointer">
                <span className="text-[12.5px] text-gray-800">
                  {step.label}
                  {step.hint && <span className="ml-2 text-[11px] text-gray-400">{step.hint}</span>}
                </span>
                <span className="inline-flex items-center">
                  <input type="checkbox" checked={included.has(step.key)} onChange={() => onToggleStep(step.key)} disabled={saving} className="sr-only peer" />
                  <span className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-forest-700 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4 peer-disabled:opacity-50" />
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-lg bg-page-bg border border-gray-200 p-4">
        <h4 className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Parcours résultant</h4>
        <div className="flex flex-wrap items-center gap-1.5">
          {previewPhases.map((p, i) => (
            <span key={p.key} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">&rarr;</span>}
              <span className="text-[11.5px] font-semibold text-forest-800 bg-white border border-gray-200 rounded-full px-2.5 py-0.5">{p.label}</span>
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-gray-500">
          Cadrage &mdash; sous-&eacute;tapes&nbsp;: {includedScoping.length > 0 ? includedScoping.join(' · ') : 'périmètre seul'}
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isDefault} onChange={(e) => onChangeDefault(e.target.checked)} disabled={saving} className="rounded border-gray-300 text-forest-600" />
        <span className="text-[12.5px] text-gray-700">Template par d&eacute;faut (pr&eacute;-s&eacute;lectionn&eacute; &agrave; la cr&eacute;ation de mission)</span>
      </label>

      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={saving} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Retour</button>
        <button type="submit" disabled={saving || !name.trim()} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Enregistrement…' : isEditing ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}
