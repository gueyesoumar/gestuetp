import { useState, useEffect, useRef, useCallback } from 'react'
import { AlertTriangle, BookmarkPlus, Check } from 'lucide-react'
import { MarkdownToolbar } from '../../../../components/ui/MarkdownToolbar'
import { TemplateChips } from './TemplateChips'
import type { AssessmentFinding, FindingPatch } from './useAssessmentFindings'
import type { FindingTemplate } from '../../../../types/database.types'
import type { SaveTemplateInput } from './useFindingTemplates'

interface FindingBodyProps {
  finding: AssessmentFinding
  readOnly: boolean
  onChange: (patch: FindingPatch) => Promise<boolean>
  /** Constats-types du contrôle (toutes classifications) — filtrés ici sur la classif. du constat. */
  templates: FindingTemplate[]
  onSaveTemplate?: (input: SaveTemplateInput) => Promise<boolean>
}

export function FindingBody({ finding, readOnly, onChange, templates, onSaveTemplate }: FindingBodyProps): JSX.Element {
  const [description, setDescription] = useState(finding.description)
  const [risk, setRisk] = useState(finding.risk ?? '')
  const [recommendation, setRecommendation] = useState(finding.recommendation ?? '')
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const riskRef = useRef<HTMLTextAreaElement>(null)
  const recommendationRef = useRef<HTMLTextAreaElement>(null)

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
  // Catalogue lié : constats-types de la classification courante ; le constat choisi adapte risques/recos.
  const constatTemplates = templates.filter((t) => t.classification === finding.classification)
  const selectedTpl = constatTemplates.find((t) => t.description.trim() === description.trim()) ?? null
  const hasConstat = description.trim().length > 0
  const alreadyInCabinet = !!selectedTpl && selectedTpl.scope === 'cabinet'

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

  return (
    <div className="px-3 py-3 space-y-3">
      <div>
        <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Constat</span>
        {!readOnly && <TemplateChips options={constatTemplates.map((t) => t.description)} value={description} onPick={(v) => { setDescription(v); debouncedSave({ description: v }) }} />}
        <MarkdownToolbar textareaRef={descriptionRef} disabled={readOnly} onChange={(v) => { setDescription(v); debouncedSave({ description: v }) }} />
        <textarea
          ref={descriptionRef} value={description} disabled={readOnly}
          onChange={(e) => { setDescription(e.target.value); debouncedSave({ description: e.target.value }) }}
          placeholder="Décrire le constat factuellement..."
          className="w-full min-h-[60px] px-3 py-2 border border-gray-200 rounded-b-lg text-[12px] text-gray-900 leading-relaxed outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white"
        />
      </div>

      {!isStrength && hasConstat && (
        <>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1"><AlertTriangle size={10} className="inline mb-0.5" /> Risque associé</span>
            {!readOnly && <TemplateChips options={selectedTpl?.risks ?? []} value={risk} onPick={(v) => { setRisk(v); debouncedSave({ risk: v || null }) }} />}
            <MarkdownToolbar textareaRef={riskRef} disabled={readOnly} onChange={(v) => { setRisk(v); debouncedSave({ risk: v || null }) }} />
            <textarea
              ref={riskRef} value={risk} disabled={readOnly}
              onChange={(e) => { setRisk(e.target.value); debouncedSave({ risk: e.target.value || null }) }}
              placeholder="Quel risque ce constat représente-t-il ?"
              className="w-full min-h-[44px] px-3 py-2 border border-amber-200 bg-amber-50/30 rounded-b-lg text-[11px] text-gray-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 resize-y disabled:bg-gray-50"
            />
          </div>

          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Recommandation</span>
            {!readOnly && <TemplateChips options={selectedTpl?.recommendations ?? []} value={recommendation} onPick={(v) => { setRecommendation(v); debouncedSave({ recommendation: v || null }) }} />}
            <MarkdownToolbar textareaRef={recommendationRef} disabled={readOnly} onChange={(v) => { setRecommendation(v); debouncedSave({ recommendation: v || null }) }} />
            <textarea
              ref={recommendationRef} value={recommendation} disabled={readOnly}
              onChange={(e) => { setRecommendation(e.target.value); debouncedSave({ recommendation: e.target.value || null }) }}
              placeholder="Action concrète à mener pour corriger..."
              className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-b-lg text-[11px] text-gray-700 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white"
            />
          </div>
        </>
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
            <BookmarkPlus size={12} /> Enregistrer dans la bibliothèque du cabinet
          </button>
        )
      )}
    </div>
  )
}
