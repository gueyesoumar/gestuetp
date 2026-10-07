import { useState, useEffect, useRef, useCallback, type RefObject } from 'react'
import { AlertTriangle, BookmarkPlus, Check } from 'lucide-react'
import { MarkdownToolbar } from '../../../../components/ui/MarkdownToolbar'
import { FindingOptionList } from './FindingOptionList'
import type { AssessmentFinding, FindingPatch } from './useAssessmentFindings'
import type { FindingTemplate } from '../../../../types/database.types'
import type { SaveTemplateInput } from './useFindingTemplates'

type StepKey = 'constat' | 'risk' | 'reco'

const STEP_LABEL: Record<StepKey, string> = {
  constat: 'Constat',
  risk: 'Risque associé',
  reco: 'Recommandation',
}
const STEP_PLACEHOLDER: Record<StepKey, string> = {
  constat: 'Décrire le constat factuellement...',
  risk: 'Quel risque ce constat représente-t-il ?',
  reco: 'Action concrète à mener pour corriger...',
}

function isNcClassification(c: string): boolean {
  return c === 'major_nc' || c === 'minor_nc'
}

/** Première étape non renseignée (à l'ouverture d'un constat). */
function firstEmptyStep(f: AssessmentFinding): StepKey | null {
  const want = isNcClassification(f.classification) ||
    (f.classification !== 'strength' && ((f.risk?.trim().length ?? 0) > 0 || (f.recommendation?.trim().length ?? 0) > 0))
  const steps: StepKey[] = want ? ['constat', 'risk', 'reco'] : ['constat']
  const valOf = (k: StepKey): string => k === 'constat' ? f.description : k === 'risk' ? (f.risk ?? '') : (f.recommendation ?? '')
  return steps.find((k) => !valOf(k).trim()) ?? null
}

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
  const [openStep, setOpenStep] = useState<StepKey | null>(() => firstEmptyStep(finding))
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

  // openStep est initialisé à l'ouverture (useState) ; les cartes étant montées
  // par clé (finding.id), pas besoin de le réinitialiser sur changement de constat.

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [finding.id])

  const debouncedSave = useCallback((patch: FindingPatch) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => { void onChange(patch) }, 500)
  }, [onChange])

  const isStrength = finding.classification === 'strength'
  const isNC = isNcClassification(finding.classification)
  // Catalogue lié : constats-types de la classification courante ; le constat choisi adapte risques/recos.
  const constatTemplates = templates.filter((t) => t.classification === finding.classification)
  const selectedTpl = constatTemplates.find((t) => t.description.trim() === description.trim()) ?? null
  const hasConstat = description.trim().length > 0
  const alreadyInCabinet = !!selectedTpl && selectedTpl.scope === 'cabinet'

  // Étapes affichées : NC → 3 étapes ; observation avec risque/reco déjà saisis → 3 ; sinon constat seul.
  const wantRiskReco = isNC || (!isStrength && (risk.trim().length > 0 || recommendation.trim().length > 0))
  const steps: StepKey[] = wantRiskReco ? ['constat', 'risk', 'reco'] : ['constat']

  const valueOf = (k: StepKey): string => k === 'constat' ? description : k === 'risk' ? risk : recommendation
  const refOf = (k: StepKey): RefObject<HTMLTextAreaElement | null> => k === 'constat' ? descriptionRef : k === 'risk' ? riskRef : recommendationRef
  const optionsOf = (k: StepKey): string[] => k === 'constat' ? constatTemplates.map((t) => t.description) : k === 'risk' ? (selectedTpl?.risks ?? []) : (selectedTpl?.recommendations ?? [])

  const applyStep = (k: StepKey, v: string): void => {
    if (k === 'constat') { setDescription(v); debouncedSave({ description: v }) }
    else if (k === 'risk') { setRisk(v); debouncedSave({ risk: v || null }) }
    else { setRecommendation(v); debouncedSave({ recommendation: v || null }) }
  }

  // Étape suivante non renseignée après `k` (avec les valeurs courantes, override sur `k`).
  const nextEmptyAfter = (k: StepKey, overrideVal: string): StepKey | null => {
    const idx = steps.indexOf(k)
    for (let i = idx + 1; i < steps.length; i++) {
      const v = steps[i] === k ? overrideVal : valueOf(steps[i])
      if (!v.trim()) return steps[i]
    }
    return null
  }

  const handlePick = (k: StepKey, v: string): void => {
    applyStep(k, v)
    setOpenStep(nextEmptyAfter(k, v))
  }

  // Replie l'étape quand le focus quitte tout son bloc (textarea + barre + options) et qu'elle est renseignée.
  const handleStepBlur = (k: StepKey): void => {
    if (openStep !== k) return
    if (valueOf(k).trim()) setOpenStep(nextEmptyAfter(k, valueOf(k)))
  }

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

  const textareaCls = (k: StepKey): string => k === 'risk'
    ? 'w-full min-h-[44px] px-3 py-2 border border-amber-200 bg-amber-50/30 rounded-b-lg text-[11px] text-gray-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 resize-y disabled:bg-gray-50'
    : k === 'reco'
      ? 'w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-b-lg text-[11px] text-gray-700 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white'
      : 'w-full min-h-[60px] px-3 py-2 border border-gray-200 rounded-b-lg text-[12px] text-gray-900 leading-relaxed outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white'

  return (
    <div className="px-3 py-3 space-y-2.5">
      {steps.map((k) => {
        const val = valueOf(k)
        const expanded = openStep === k
        // Étape renseignée et repliée → résumé « choix validé ».
        if (!expanded && val.trim()) {
          return (
            <div key={k} className="flex items-start gap-2 rounded-lg border border-forest-100 bg-forest-50 px-3 py-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-forest-700 text-white flex items-center justify-center mt-0.5"><Check size={10} /></span>
              <div className="flex-1 min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-forest-700">{STEP_LABEL[k]}</span>
                <span className="block text-[12px] text-gray-900 leading-snug whitespace-pre-wrap break-words">{val}</span>
              </div>
              {!readOnly && (
                <button type="button" onClick={() => setOpenStep(k)} className="shrink-0 text-[11px] font-semibold text-forest-700 hover:text-forest-900">
                  Changer
                </button>
              )}
            </div>
          )
        }
        // Étape future non renseignée (et non active) → verrouillée tant que l'étape active n'est pas validée.
        if (!expanded) return null
        // Étape active (dépliée).
        return (
          <div key={k} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) handleStepBlur(k) }}>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              {k === 'risk' && <AlertTriangle size={10} className="inline mb-0.5" />} {STEP_LABEL[k]}
            </span>
            {!readOnly && <FindingOptionList options={optionsOf(k)} value={val} onPick={(v) => handlePick(k, v)} />}
            {!readOnly && <MarkdownToolbar textareaRef={refOf(k)} disabled={readOnly} onChange={(v) => applyStep(k, v)} />}
            <textarea
              ref={refOf(k)} value={val} disabled={readOnly}
              onChange={(e) => applyStep(k, e.target.value)}
              placeholder={STEP_PLACEHOLDER[k]}
              className={textareaCls(k)}
            />
          </div>
        )
      })}

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
