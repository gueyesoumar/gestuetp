import { useState, useEffect, useRef, useCallback } from 'react'
import { AlertTriangle, BookmarkPlus, Check, ChevronDown } from 'lucide-react'
import { FindingOptionList } from './FindingOptionList'
import type { AssessmentFinding, FindingPatch } from './useAssessmentFindings'
import type { FindingTemplate } from '../../../../types/database.types'
import type { SaveTemplateInput } from './useFindingTemplates'

function isNcClassification(c: string): boolean {
  return c === 'major_nc' || c === 'minor_nc'
}

type PropKey = 'constat' | 'risk' | 'reco'

interface FindingBodyProps {
  finding: AssessmentFinding
  readOnly: boolean
  onChange: (patch: FindingPatch) => Promise<boolean>
  templates: FindingTemplate[]
  onSaveTemplate?: (input: SaveTemplateInput) => Promise<boolean>
}

/**
 * Corps compact d'un constat : énoncé + (risque / recommandation côte à côte pour une NC),
 * chacun avec un sélecteur de propositions repliable (catalogue lié). Pas de barre markdown
 * ni d'étapes empilées — l'objectif est de minimiser la hauteur.
 */
export function FindingBody({ finding, readOnly, onChange, templates, onSaveTemplate }: FindingBodyProps): JSX.Element {
  const [description, setDescription] = useState(finding.description)
  const [risk, setRisk] = useState(finding.risk ?? '')
  const [recommendation, setRecommendation] = useState(finding.recommendation ?? '')
  const [saved, setSaved] = useState(false)
  const [openProp, setOpenProp] = useState<PropKey | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setDescription(finding.description)
    setRisk(finding.risk ?? '')
    setRecommendation(finding.recommendation ?? '')
    setSaved(false)
  }, [finding.id, finding.description, finding.risk, finding.recommendation])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [finding.id])

  const debouncedSave = useCallback((patch: FindingPatch) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => { void onChange(patch) }, 500)
  }, [onChange])

  const isStrength = finding.classification === 'strength'
  const showRiskReco = isNcClassification(finding.classification) || (!isStrength && (risk.trim().length > 0 || recommendation.trim().length > 0))

  // Constats-types du contrôle, toutes classifications, dédupliqués par énoncé.
  const constatTemplates = Array.from(new Map(templates.map((t) => [t.description.trim(), t])).values())
  const selectedTpl = constatTemplates.find((t) => t.description.trim() === description.trim()) ?? null
  const hasConstat = description.trim().length > 0
  const alreadyInCabinet = !!selectedTpl && selectedTpl.scope === 'cabinet'

  const toggle = (k: PropKey): void => setOpenProp((cur) => (cur === k ? null : k))

  const handleSaveToLib = async (): Promise<void> => {
    if (!onSaveTemplate) return
    const ok = await onSaveTemplate({
      classification: finding.classification,
      description,
      risks: risk.trim() ? [risk.trim()] : [],
      recommendations: recommendation.trim() ? [recommendation.trim()] : [],
    })
    if (ok) setSaved(true)
  }

  const propBtn = (k: PropKey, count: number, label: string): JSX.Element | null => {
    if (readOnly || count === 0) return null
    return (
      <button type="button" onClick={() => toggle(k)}
        className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-forest-700 hover:text-forest-900">
        {label} <ChevronDown size={11} className={openProp === k ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
    )
  }

  const taCls = 'w-full min-h-[46px] px-3 py-2 border border-gray-200 rounded-lg text-[12px] text-gray-900 leading-relaxed outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white'

  return (
    <div className="px-3 py-3 space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Constat</span>
          {propBtn('constat', constatTemplates.length, 'Choisir un constat-type')}
        </div>
        {openProp === 'constat' && !readOnly && (
          <div className="mb-2"><FindingOptionList options={constatTemplates.map((t) => t.description)} value={description} onPick={(v) => { setDescription(v); debouncedSave({ description: v }); setOpenProp(null) }} /></div>
        )}
        <textarea value={description} disabled={readOnly}
          onChange={(e) => { setDescription(e.target.value); debouncedSave({ description: e.target.value }) }}
          placeholder="Décrire le constat factuellement..." className={taCls} />
      </div>

      {showRiskReco && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-red-600"><AlertTriangle size={10} className="inline mb-0.5" /> Risque</span>
              {propBtn('risk', selectedTpl?.risks?.length ?? 0, 'Propositions')}
            </div>
            {openProp === 'risk' && !readOnly && (
              <div className="mb-2"><FindingOptionList options={selectedTpl?.risks ?? []} value={risk} onPick={(v) => { setRisk(v); debouncedSave({ risk: v || null }); setOpenProp(null) }} /></div>
            )}
            <textarea value={risk} disabled={readOnly}
              onChange={(e) => { setRisk(e.target.value); debouncedSave({ risk: e.target.value || null }) }}
              placeholder="Risque encouru..." className={taCls} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">&rarr; Recommandation</span>
              {propBtn('reco', selectedTpl?.recommendations?.length ?? 0, 'Propositions')}
            </div>
            {openProp === 'reco' && !readOnly && (
              <div className="mb-2"><FindingOptionList options={selectedTpl?.recommendations ?? []} value={recommendation} onPick={(v) => { setRecommendation(v); debouncedSave({ recommendation: v || null }); setOpenProp(null) }} /></div>
            )}
            <textarea value={recommendation} disabled={readOnly}
              onChange={(e) => { setRecommendation(e.target.value); debouncedSave({ recommendation: e.target.value || null }) }}
              placeholder="Action concrète à mener..." className={taCls} />
          </div>
        </div>
      )}

      {isStrength && (
        <p className="text-[10px] text-gray-400 italic">Pas de risque ni de recommandation pour un point fort.</p>
      )}

      {!readOnly && onSaveTemplate && hasConstat && !alreadyInCabinet && (
        saved ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700"><Check size={12} /> Enregistré dans la bibliothèque</span>
        ) : (
          <button type="button" onClick={() => void handleSaveToLib()}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-forest-700 hover:text-forest-900"
            title="Réutilisable sur les prochaines missions — texte générique, sans données client">
            <BookmarkPlus size={12} /> Enregistrer dans la bibliothèque
          </button>
        )
      )}
    </div>
  )
}
