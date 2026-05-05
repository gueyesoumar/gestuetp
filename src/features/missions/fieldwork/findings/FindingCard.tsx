import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronUp, ChevronDown, Trash2, Sparkles, AlertTriangle } from 'lucide-react'
import { MarkdownToolbar } from '../../../../components/ui/MarkdownToolbar'
import { FindingClassificationPicker, FindingPriorityPicker, getClassificationConfig } from './FindingPickers'
import type { AssessmentFinding, FindingPatch } from './useAssessmentFindings'

interface FindingCardProps {
  finding: AssessmentFinding
  index: number
  total: number
  readOnly: boolean
  onChange: (patch: FindingPatch) => Promise<boolean>
  onDelete: () => Promise<boolean>
  onMoveUp: () => Promise<boolean>
  onMoveDown: () => Promise<boolean>
}

function formatDeadline(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function FindingCard({ finding, index, total, readOnly, onChange, onDelete, onMoveUp, onMoveDown }: FindingCardProps) {
  const [description, setDescription] = useState(finding.description)
  const [risk, setRisk] = useState(finding.risk ?? '')
  const [recommendation, setRecommendation] = useState(finding.recommendation ?? '')
  const debounceRef = useRef<number | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const riskRef = useRef<HTMLTextAreaElement>(null)
  const recommendationRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDescription(finding.description)
    setRisk(finding.risk ?? '')
    setRecommendation(finding.recommendation ?? '')
  }, [finding.id, finding.description, finding.risk, finding.recommendation])

  const debouncedSave = useCallback((patch: FindingPatch) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => { void onChange(patch) }, 500)
  }, [onChange])

  // Clear pending debounce on unmount or when finding id changes — avoid late save on stale finding
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [finding.id])

  const classifCfg = getClassificationConfig(finding.classification)
  const isStrength = finding.classification === 'strength'

  const handleConfirmDelete = async () => {
    if (!window.confirm('Supprimer ce constat ?')) return
    await onDelete()
  }

  return (
    <div className={`border rounded-xl bg-white overflow-hidden ${classifCfg.cardBorder}`}>
      <div className={`flex items-center gap-2 flex-wrap px-3 py-2 ${classifCfg.cardBg} border-b ${classifCfg.cardBorder}`}>
        <span className="font-mono text-[10px] font-bold tracking-wide text-gray-500">
          CONSTAT {String(index + 1).padStart(2, '0')}
        </span>

        <FindingClassificationPicker
          value={finding.classification}
          readOnly={readOnly}
          onChange={(p) => { void onChange(p) }}
        />

        {!isStrength && (
          <FindingPriorityPicker
            value={finding.priority}
            readOnly={readOnly}
            onChange={(p) => { void onChange(p) }}
          />
        )}

        {finding.ai_generated && (
          <span className="text-[9px] font-bold uppercase tracking-wide text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
            <Sparkles size={9} /> IA
          </span>
        )}

        {!readOnly && (
          <div className="ml-auto flex items-center gap-0.5">
            <button type="button" onClick={() => void onMoveUp()} disabled={index === 0}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1" aria-label="Monter">
              <ChevronUp size={13} />
            </button>
            <button type="button" onClick={() => void onMoveDown()} disabled={index === total - 1}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1" aria-label="Descendre">
              <ChevronDown size={13} />
            </button>
            <button type="button" onClick={handleConfirmDelete}
              className="text-red-400 hover:text-red-600 p-1" aria-label="Supprimer">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="px-3 py-3 space-y-3">
        <FieldBlock label="Constat">
          <MarkdownToolbar
            textareaRef={descriptionRef}
            disabled={readOnly}
            onChange={(v) => { setDescription(v); debouncedSave({ description: v }) }}
          />
          <textarea
            ref={descriptionRef}
            value={description}
            onChange={(e) => { setDescription(e.target.value); debouncedSave({ description: e.target.value }) }}
            disabled={readOnly}
            placeholder="D&eacute;crire le constat factuellement..."
            className="w-full min-h-[60px] px-3 py-2 border border-gray-200 rounded-b-lg text-[12px] text-gray-900 leading-relaxed outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white"
          />
        </FieldBlock>

        {!isStrength && (
          <>
            <FieldBlock label={<><AlertTriangle size={10} className="inline mb-0.5" /> Risque associ&eacute;</>}>
              <MarkdownToolbar
                textareaRef={riskRef}
                disabled={readOnly}
                onChange={(v) => { setRisk(v); debouncedSave({ risk: v || null }) }}
              />
              <textarea
                ref={riskRef}
                value={risk}
                onChange={(e) => { setRisk(e.target.value); debouncedSave({ risk: e.target.value || null }) }}
                disabled={readOnly}
                placeholder="Quel risque ce constat repr&eacute;sente-t-il ?"
                className="w-full min-h-[44px] px-3 py-2 border border-amber-200 bg-amber-50/30 rounded-b-lg text-[11px] text-gray-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 resize-y disabled:bg-gray-50"
              />
            </FieldBlock>

            <FieldBlock label="Recommandation">
              <MarkdownToolbar
                textareaRef={recommendationRef}
                disabled={readOnly}
                onChange={(v) => { setRecommendation(v); debouncedSave({ recommendation: v || null }) }}
              />
              <textarea
                ref={recommendationRef}
                value={recommendation}
                onChange={(e) => { setRecommendation(e.target.value); debouncedSave({ recommendation: e.target.value || null }) }}
                disabled={readOnly}
                placeholder="Action concr&egrave;te &agrave; mener pour corriger..."
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-b-lg text-[11px] text-gray-700 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white"
              />
            </FieldBlock>
          </>
        )}

        {isStrength && (
          <p className="text-[10px] text-gray-400 italic">Pas de risque ni de recommandation pour un point fort.</p>
        )}
      </div>

      {!isStrength && (
        <div className="flex items-center gap-3 flex-wrap px-3 py-2 border-t border-gray-100 bg-gray-50/50">
          <div className="text-[10px] text-gray-500 inline-flex items-center gap-1.5">
            <span className="font-bold uppercase tracking-wide">&Eacute;ch&eacute;ance propos&eacute;e</span>
            <input
              type="date"
              value={finding.proposed_deadline ?? ''}
              onChange={(e) => onChange({ proposed_deadline: e.target.value || null })}
              disabled={readOnly}
              className="text-[10px] px-1.5 py-0.5 border border-gray-200 rounded bg-white disabled:bg-gray-50"
            />
            {finding.proposed_deadline && (
              <span className="text-gray-700 font-medium">{formatDeadline(finding.proposed_deadline)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FieldBlock({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      {children}
    </div>
  )
}
