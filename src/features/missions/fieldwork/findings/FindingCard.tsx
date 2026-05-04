import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronUp, ChevronDown, Trash2, Sparkles } from 'lucide-react'
import { MarkdownToolbar } from '../../../../components/ui/MarkdownToolbar'
import type {
  AssessmentFinding,
  FindingClassification,
  FindingPriority,
  FindingPatch,
} from './useAssessmentFindings'

const CLASSIFICATION_OPTIONS: { value: FindingClassification; label: string; color: string }[] = [
  { value: 'major_nc', label: 'NC majeure', color: 'bg-red-50 text-red-700 border-red-300' },
  { value: 'minor_nc', label: 'NC mineure', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { value: 'observation', label: 'Observation', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'strength', label: 'Point fort', color: 'bg-green-50 text-green-700 border-green-300' },
]

const PRIORITY_OPTIONS: { value: FindingPriority; label: string }[] = [
  { value: 'critical', label: 'Critique' },
  { value: 'high', label: 'Haute' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'low', label: 'Faible' },
]

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

export function FindingCard({ finding, index, total, readOnly, onChange, onDelete, onMoveUp, onMoveDown }: FindingCardProps) {
  const [description, setDescription] = useState(finding.description)
  const [risk, setRisk] = useState(finding.risk ?? '')
  const [recommendation, setRecommendation] = useState(finding.recommendation ?? '')
  const [showOptional, setShowOptional] = useState(
    Boolean(finding.risk || finding.recommendation || finding.priority || finding.proposed_deadline),
  )
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
    debounceRef.current = window.setTimeout(() => {
      void onChange(patch)
    }, 500)
  }, [onChange])

  const colorCfg = CLASSIFICATION_OPTIONS.find((c) => c.value === finding.classification) ?? CLASSIFICATION_OPTIONS[2]

  const handleConfirmDelete = async () => {
    if (!window.confirm('Supprimer ce constat ?')) return
    await onDelete()
  }

  return (
    <div className={`border rounded-xl p-3 ${colorCfg.color}`}>
      {/* Header : classification picker + reorder + delete */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1 flex-1 flex-wrap">
          {CLASSIFICATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={readOnly}
              onClick={() => onChange({ classification: opt.value })}
              className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${
                finding.classification === opt.value
                  ? opt.color
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {finding.ai_generated && (
          <span className="text-[9px] text-purple-500 inline-flex items-center gap-0.5 shrink-0">
            <Sparkles size={10} /> IA
          </span>
        )}
        {!readOnly && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" onClick={() => void onMoveUp()} disabled={index === 0}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1" aria-label="Monter">
              <ChevronUp size={14} />
            </button>
            <button type="button" onClick={() => void onMoveDown()} disabled={index === total - 1}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1" aria-label="Descendre">
              <ChevronDown size={14} />
            </button>
            <button type="button" onClick={handleConfirmDelete}
              className="text-red-400 hover:text-red-600 p-1" aria-label="Supprimer">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <MarkdownToolbar
          textareaRef={descriptionRef}
          disabled={readOnly}
          onChange={(v) => { setDescription(v); debouncedSave({ description: v }) }}
        />
        <textarea
          ref={descriptionRef}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            debouncedSave({ description: e.target.value })
          }}
          disabled={readOnly}
          placeholder="D&eacute;crire le constat..."
          className="w-full min-h-[64px] px-3 py-2 border border-gray-200 rounded-b-lg text-[12px] text-gray-900 leading-relaxed outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white"
        />
      </div>

      {!readOnly && (
        <button type="button" onClick={() => setShowOptional((v) => !v)}
          className="text-[10px] text-gray-500 hover:text-gray-800 mt-1.5">
          {showOptional ? '▼' : '▶'} Risque, recommandation, priorit&eacute;, &eacute;ch&eacute;ance
        </button>
      )}

      {showOptional && (
        <div className="mt-2 space-y-2">
          <div>
            <MarkdownToolbar
              textareaRef={riskRef}
              disabled={readOnly}
              onChange={(v) => { setRisk(v); debouncedSave({ risk: v || null }) }}
            />
            <textarea
              ref={riskRef}
              value={risk}
              onChange={(e) => {
                setRisk(e.target.value)
                debouncedSave({ risk: e.target.value || null })
              }}
              disabled={readOnly}
              placeholder="Risque associ&eacute; (optionnel)"
              className="w-full min-h-[44px] px-3 py-2 border border-amber-200 bg-amber-50/30 rounded-b-lg text-[11px] text-gray-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 resize-y disabled:bg-gray-50"
            />
          </div>
          <div>
            <MarkdownToolbar
              textareaRef={recommendationRef}
              disabled={readOnly}
              onChange={(v) => { setRecommendation(v); debouncedSave({ recommendation: v || null }) }}
            />
            <textarea
              ref={recommendationRef}
              value={recommendation}
              onChange={(e) => {
                setRecommendation(e.target.value)
                debouncedSave({ recommendation: e.target.value || null })
              }}
              disabled={readOnly}
              placeholder="Recommandation (optionnel)"
              className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-b-lg text-[11px] text-gray-700 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y disabled:bg-gray-50 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChange({ priority: finding.priority === opt.value ? null : opt.value })}
                  className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all ${
                    finding.priority === opt.value
                      ? 'bg-forest-700 text-white border-forest-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={finding.proposed_deadline ?? ''}
              onChange={(e) => onChange({ proposed_deadline: e.target.value || null })}
              disabled={readOnly}
              className="text-[10px] px-2 py-1 border border-gray-200 rounded-md disabled:bg-gray-50 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}
