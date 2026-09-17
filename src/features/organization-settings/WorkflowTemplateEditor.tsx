import { useEffect, useState } from 'react'
import { Route } from 'lucide-react'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { getMissionPhases } from '../missions/mission-constants'
import { useWorkflowTemplate, WORKFLOW_STEP_GROUPS, ALL_DESELECTABLE_KEYS } from './useWorkflowTemplate'

/**
 * Éditeur de template de parcours (RFC 0009 INC 3). Coché = étape INCLUSE ;
 * décoché = désélectionnée. Gaté par can_manage_workflow (garde réelle = RLS).
 */
export function WorkflowTemplateEditor(): JSX.Element {
  const { canManageWorkflow, loading: permLoading } = useCabinetPermissions()
  const { disabledSteps, loading, error, saving, save } = useWorkflowTemplate()
  const [included, setIncluded] = useState<Set<string>>(new Set(ALL_DESELECTABLE_KEYS))

  useEffect(() => {
    setIncluded(new Set(ALL_DESELECTABLE_KEYS.filter((k) => !disabledSteps.includes(k))))
  }, [disabledSteps])

  const toggle = (key: string): void => {
    if (!canManageWorkflow) return
    setIncluded((prev) => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }

  const dirty = ALL_DESELECTABLE_KEYS.some((k) => included.has(k) !== !disabledSteps.includes(k))
  const disabledKeys = ALL_DESELECTABLE_KEYS.filter((k) => !included.has(k))
  const onSave = (): void => { void save(disabledKeys) }

  // Aperçu du parcours résultant (pur calcul, aucune requête).
  const previewPhases = getMissionPhases({ workflow_disabled_steps: disabledKeys })
  const scopingSteps = WORKFLOW_STEP_GROUPS.flatMap((g) => g.steps).filter((s) => s.key.startsWith('scoping.'))
  const includedScoping = scopingSteps.filter((s) => included.has(s.key)).map((s) => s.label)

  if (loading || permLoading) return <div className="mt-6"><LoadingSpinner /></div>
  if (error) return <div className="mt-6"><ErrorAlert message={error} /></div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mt-6">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Route size={14} className="text-forest-700" />
        <span className="text-[13px] font-bold text-gray-900">Parcours de mission</span>
      </header>
      <div className="p-5">
        <p className="text-[12.5px] text-gray-600 leading-relaxed">
          D&eacute;s&eacute;lectionnez les &eacute;tapes que vos missions n&rsquo;utilisent pas. Les <b>nouvelles missions</b> suivront ce parcours&nbsp;;
          les <b>missions en cours ne changent pas</b> (le parcours est fig&eacute; &agrave; leur cr&eacute;ation).
        </p>
        {!canManageWorkflow && (
          <p className="mt-2 text-[11.5px] text-gold-700 bg-gold-50 border border-gold-200 rounded-lg px-3 py-2">
            Lecture seule &mdash; la permission &laquo;&nbsp;G&eacute;rer le parcours&nbsp;&raquo; est requise pour modifier.
          </p>
        )}

        <div className="mt-4 space-y-5">
          {WORKFLOW_STEP_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold mb-2">{group.title}</h4>
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {group.steps.map((step) => (
                  <label key={step.key} className={`flex items-center justify-between gap-4 py-2.5 ${canManageWorkflow ? 'cursor-pointer' : ''}`}>
                    <span className="text-[12.5px] text-gray-800">
                      {step.label}
                      {step.hint && <span className="ml-2 text-[11px] text-gray-400">{step.hint}</span>}
                    </span>
                    <span className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={included.has(step.key)}
                        onChange={() => toggle(step.key)}
                        disabled={!canManageWorkflow || saving}
                        className="sr-only peer"
                      />
                      <span className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-forest-700 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4 peer-disabled:opacity-50" />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg bg-page-bg border border-gray-200 p-4">
          <h4 className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Parcours résultant</h4>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
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

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={!canManageWorkflow || saving || !dirty}
            className="rounded-lg bg-forest-700 hover:bg-forest-900 px-5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {dirty && !saving && <span className="text-[11.5px] text-gray-400">Modifications non enregistrées</span>}
        </div>
      </div>
    </div>
  )
}
