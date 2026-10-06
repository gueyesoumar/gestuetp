import { useState, useMemo } from 'react'
import { Plus, AlertCircle, ClipboardList, Info } from 'lucide-react'
import { FindingCard } from './FindingCard'
import { SuggestionChips } from './SuggestionChips'
import { SystemicPicker } from './SystemicPicker'
import { PromoteFindingModal } from '../../../risk/PromoteFindingModal'
import { useInterControlCtx } from '../interControl'
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
            onClick={() => void addFinding()}
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
          onPick={(label) => { void addFinding({ description: label }) }}
        />
      )}

      {loading ? (
        <div className="text-[11px] text-gray-400 italic py-4 text-center">Chargement des constats...</div>
      ) : findings.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl px-6 py-8 text-center bg-gradient-to-br from-gray-50 to-white">
          <div className="w-11 h-11 rounded-full bg-forest-50 border border-forest-200 mx-auto mb-3 flex items-center justify-center">
            <ClipboardList size={18} className="text-forest-700" />
          </div>
          <p className="text-[13px] font-semibold text-gray-700 mb-1">Aucun constat pour ce contr&ocirc;le</p>
          {!readOnly ? (
            <>
              <p className="text-[11px] text-gray-500 mb-4 max-w-xs mx-auto leading-relaxed">
                Demandez une <strong>suggestion IA</strong> en haut de l&apos;&eacute;tape, ou ajoutez un constat manuellement.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void addFinding()}
                  className="text-[11px] font-semibold text-white bg-forest-700 px-3 py-1.5 rounded-lg hover:bg-forest-900 inline-flex items-center gap-1.5"
                >
                  <Plus size={12} /> Ajouter un constat
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-4 inline-flex items-center gap-1 italic">
                <Info size={10} /> Contr&ocirc;le <strong>Conforme</strong> : soumettez directement, une note &laquo;&nbsp;Conforme, aucun &eacute;cart&nbsp;&raquo; sera jointe. Sinon, ajoutez au moins un constat.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-gray-400 italic">Aucun constat saisi pour ce contr&ocirc;le.</p>
          )}
        </div>
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
