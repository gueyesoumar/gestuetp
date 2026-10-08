import { useState, useMemo } from 'react'
import { Plus, AlertCircle, Info } from 'lucide-react'
import { FindingCard } from './FindingCard'
import { SuggestionChips } from './SuggestionChips'
import { SystemicPicker } from './SystemicPicker'
import { PromoteFindingModal } from '../../../risk/PromoteFindingModal'
import { useInterControlCtx } from '../interControl'
import { useFindingTemplates } from './useFindingTemplates'
import { useToast } from '../../../../hooks/useToast'
import type { AssessmentFinding, UseAssessmentFindingsReturn } from './useAssessmentFindings'
import type { AssessmentWithControl } from '../../useAuditorAssessments'

interface FindingsEditorProps {
  findingsHook: UseAssessmentFindingsReturn
  readOnly: boolean
  /** Suggestions de constats dérivées du référentiel (controls.audit_checklist). */
  checklistSuggestions?: string[]
  /** Contrôle courant — active le constat systémique (propagation vers contrôles liés). */
  assessment?: AssessmentWithControl
}

export function FindingsEditor({ findingsHook, readOnly, checklistSuggestions = [], assessment }: FindingsEditorProps) {
  const { findings, loading, error, addFinding, updateFinding, deleteFinding, moveFinding, refetch } = findingsHook
  const [promoteTarget, setPromoteTarget] = useState<AssessmentFinding | null>(null)
  const interControl = useInterControlCtx()
  const { templates, saveTemplate } = useFindingTemplates(assessment?.control_id)
  const toast = useToast()
  const [systemicFor, setSystemicFor] = useState<AssessmentFinding | null>(null)
  const [systemicSaving, setSystemicSaving] = useState(false)

  const canSystemic = !!interControl && !!assessment && !readOnly

  const confirmSystemic = async (assessmentIds: string[]): Promise<void> => {
    if (!interControl || !systemicFor) return
    setSystemicSaving(true)
    const groupId = crypto.randomUUID()
    const okOrigin = await updateFinding(systemicFor.id, { systemic_group_id: groupId, is_systemic_origin: true })
    const okMirrors = okOrigin && await interControl.createSystemic(systemicFor, assessmentIds, groupId)
    setSystemicSaving(false)
    if (okOrigin && okMirrors) {
      interControl.refetch()
      toast.success('Constat systémique créé', { description: `${assessmentIds.length + 1} contrôles couverts.` })
      setSystemicFor(null)
    } else {
      toast.error('Création du constat systémique impossible')
    }
  }

  // Points à vérifier non encore saisis comme constat (évite les doublons).
  const remainingSuggestions = useMemo(() => {
    const used = new Set(findings.map((f) => f.description.trim().toLowerCase()))
    return checklistSuggestions.filter((s) => s.trim() && !used.has(s.trim().toLowerCase()))
  }, [checklistSuggestions, findings])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-semibold text-gray-900">
            Constats <span className="text-red-600">*</span>
            <span className="text-[11px] font-normal text-gray-400 ml-1.5">({findings.length})</span>
          </h4>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Un constat = un &eacute;cart isol&eacute;, une observation ou un point fort.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => void addFinding({ classification: 'minor_nc' })}
            className="text-[11px] font-semibold text-forest-700 bg-white border border-forest-300 px-3 py-1.5 rounded-lg hover:bg-forest-50 inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus size={13} /> Ajouter un constat
          </button>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 inline-flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {!readOnly && remainingSuggestions.length > 0 && (
        <SuggestionChips
          suggestions={remainingSuggestions}
          onPick={(label) => { void addFinding({ description: label, classification: 'minor_nc' }) }}
        />
      )}

      {loading ? (
        <div className="text-[11px] text-gray-400 italic py-4 text-center">Chargement des constats...</div>
      ) : findings.length === 0 ? (
        // État vide épuré : pas d'encadré ni de bouton en double (le bouton « Ajouter
        // un constat » est déjà en haut à droite). On garde seulement le rappel de la
        // voie express « Conforme ».
        !readOnly ? (
          <p className="text-[11px] text-gray-400 italic flex items-start gap-1.5 py-1 leading-relaxed">
            <Info size={11} className="shrink-0 mt-0.5 text-gray-300" />
            <span>
              Aucun constat. Si le contrôle est <strong className="font-semibold text-gray-500">Conforme</strong>, soumettez directement &mdash; une note «&nbsp;Conforme, aucun écart&nbsp;» sera jointe. Sinon, ajoutez un constat ci-dessus (ou via une suggestion IA).
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-gray-400 italic py-1">Aucun constat saisi pour ce contrôle.</p>
        )
      ) : (
        <div className="space-y-2">
          {findings.map((f, idx) => (
            <FindingCard
              key={f.id}
              finding={f}
              index={idx}
              total={findings.length}
              readOnly={readOnly}
              onChange={(patch) => updateFinding(f.id, patch)}
              onDelete={() => deleteFinding(f.id)}
              onMoveUp={() => moveFinding(f.id, 'up')}
              onMoveDown={() => moveFinding(f.id, 'down')}
              onPromote={setPromoteTarget}
              systemicCount={interControl?.groupCount(f.systemic_group_id)}
              onMakeSystemic={canSystemic ? setSystemicFor : undefined}
              templates={templates}
              onSaveTemplate={assessment && !readOnly ? saveTemplate : undefined}
            />
          ))}
        </div>
      )}

      {promoteTarget && (
        <PromoteFindingModal
          finding={promoteTarget}
          onClose={() => setPromoteTarget(null)}
          onDone={() => void refetch()}
        />
      )}

      {systemicFor && interControl && assessment && (
        <SystemicPicker
          controlCode={assessment.control.code}
          findingLabel={systemicFor.description || '(constat)'}
          targets={interControl.linkedTargets(assessment.control_id)}
          saving={systemicSaving}
          onConfirm={(ids) => { void confirmSystemic(ids) }}
          onClose={() => setSystemicFor(null)}
        />
      )}
    </div>
  )
}
