import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronUp, ChevronDown, Trash2, Sparkles, AlertTriangle } from 'lucide-react'
import { MarkdownToolbar } from '../../../../components/ui/MarkdownToolbar'
import type {
  AssessmentFinding,
  FindingClassification,
  FindingPriority,
  FindingPatch,
} from './useAssessmentFindings'

const CLASSIFICATION_OPTIONS: { value: FindingClassification; label: string; pillBg: string; cardBg: string; cardBorder: string }[] = [
  { value: 'major_nc',    label: 'NC majeure',  pillBg: 'bg-red-50 text-red-700',       cardBg: 'bg-red-50/30',     cardBorder: 'border-red-200' },
  { value: 'minor_nc',    label: 'NC mineure',  pillBg: 'bg-orange-50 text-orange-700', cardBg: 'bg-orange-50/30',  cardBorder: 'border-orange-200' },
  { value: 'observation', label: 'Observation', pillBg: 'bg-blue-50 text-blue-700',     cardBg: 'bg-blue-50/30',    cardBorder: 'border-blue-200' },
  { value: 'strength',    label: 'Point fort',  pillBg: 'bg-green-50 text-green-700',   cardBg: 'bg-green-50/30',   cardBorder: 'border-green-200' },
]

const PRIORITY_OPTIONS: { value: FindingPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critique', color: 'bg-red-600 text-white border-red-600' },
  { value: 'high',     label: 'Haute',    color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'medium',   label: 'Moyenne',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'low',      label: 'Faible',   color: 'bg-gray-50 text-gray-600 border-gray-200' },
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
  const [showClassifPicker, setShowClassifPicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
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

  const classifCfg = CLASSIFICATION_OPTIONS.find((c) => c.value === finding.classification) ?? CLASSIFICATION_OPTIONS[2]
  const priorityCfg = finding.priority ? PRIORITY_OPTIONS.find((p) => p.value === finding.priority) : null
  const isStrength = finding.classification === 'strength'

  const handleConfirmDelete = async () => {
    if (!window.confirm('Supprimer ce constat ?')) return
    await onDelete()
  }

  const formatDeadline = (iso: string | null): string => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div className={`border rounded-xl bg-white overflow-hidden ${classifCfg.cardBorder}`}>
      {/* HEADER : numbering + classification + priority + actions */}
      <div className={`flex items-center gap-2 flex-wrap px-3 py-2 ${classifCfg.cardBg} border-b ${classifCfg.cardBorder}`}>
        <span className="font-mono text-[10px] font-bold tracking-wide text-gray-500">
          CONSTAT {String(index + 1).padStart(2, '0')}
        </span>

        {/* Classification pill — click to expand picker */}
        <div className="relative">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setShowClassifPicker((v) => !v)}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${classifCfg.pillBg} disabled:opacity-50`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            {classifCfg.label}
            {!readOnly && <ChevronDown size={10} />}
          </button>
          {showClassifPicker && !readOnly && (
            <div className="absolute top-full left-0 mt-1 z-10 flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[140px]">
              {CLASSIFICATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange({ classification: opt.value }); setShowClassifPicker(false) }}
                  className={`text-left text-[11px] px-2 py-1 rounded ${
                    finding.classification === opt.value ? opt.pillBg + ' font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-60 mr-1.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority pill — click to expand picker (hidden for strength) */}
        {!isStrength && (
          <div className="relative">
            {priorityCfg ? (
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setShowPriorityPicker((v) => !v)}
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${priorityCfg.color} disabled:opacity-50`}
              >
                {priorityCfg.label}
                {!readOnly && <ChevronDown size={9} />}
              </button>
            ) : !readOnly ? (
              <button
                type="button"
                onClick={() => setShowPriorityPicker((v) => !v)}
                className="text-[10px] text-gray-400 hover:text-gray-700 px-1.5 py-0.5 border border-dashed border-gray-300 rounded"
              >
                + Priorit&eacute;
              </button>
            ) : null}
            {showPriorityPicker && !readOnly && (
              <div className="absolute top-full left-0 mt-1 z-10 flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[120px]">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange({ priority: opt.value }); setShowPriorityPicker(false) }}
                    className={`text-left text-[11px] px-2 py-1 rounded border ${
                      finding.priority === opt.value ? opt.color + ' font-semibold' : 'border-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {finding.priority && (
                  <button
                    type="button"
                    onClick={() => { onChange({ priority: null }); setShowPriorityPicker(false) }}
                    className="text-left text-[10px] px-2 py-1 text-gray-400 hover:text-red-600 border-t border-gray-100 mt-1"
                  >
                    Effacer
                  </button>
                )}
              </div>
            )}
          </div>
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

      {/* BODY : 3 fields with labels */}
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

      {/* META ROW : priority shown above, deadline + ai badge */}
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
