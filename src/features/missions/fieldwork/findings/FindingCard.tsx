import { ChevronUp, ChevronDown, Trash2, Sparkles, ArrowUpRight, Check, GitBranch } from 'lucide-react'
import { FindingClassificationPicker, FindingPriorityPicker, getClassificationConfig } from './FindingPickers'
import { FindingBody } from './FindingBody'
import type { AssessmentFinding, FindingPatch } from './useAssessmentFindings'
import type { FindingTemplate } from '../../../../types/database.types'
import type { SaveTemplateInput } from './useFindingTemplates'

interface FindingCardProps {
  finding: AssessmentFinding
  index: number
  total: number
  readOnly: boolean
  onChange: (patch: FindingPatch) => Promise<boolean>
  onDelete: () => Promise<boolean>
  onMoveUp: () => Promise<boolean>
  onMoveDown: () => Promise<boolean>
  /** Fourni uniquement en contexte staff terrain → active « Promouvoir vers le registre ». */
  onPromote?: (finding: AssessmentFinding) => void
  /** Nombre de contrôles couverts par le groupe systémique (>1 → affiche le badge « Systémique »). */
  systemicCount?: number
  /** Ouvre le sélecteur « étendre à des contrôles liés » (non fourni → action masquée). */
  onMakeSystemic?: (finding: AssessmentFinding) => void
  /** Constats-types du contrôle (catalogue lié) — pastilles de saisie. */
  templates?: FindingTemplate[]
  /** Enregistre un constat-type dans la bibliothèque du cabinet. */
  onSaveTemplate?: (input: SaveTemplateInput) => Promise<boolean>
}

function formatDeadline(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function FindingCard({ finding, index, total, readOnly, onChange, onDelete, onMoveUp, onMoveDown, onPromote, systemicCount, onMakeSystemic, templates = [], onSaveTemplate }: FindingCardProps) {
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

        {finding.systemic_group_id ? (
          <span className="text-[9px] font-bold uppercase tracking-wide text-forest-700 bg-forest-50 border border-forest-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1" title="Constat répliqué sur plusieurs contrôles liés">
            <GitBranch size={9} /> Systémique{systemicCount && systemicCount > 1 ? ` · ${systemicCount} contrôles` : ''}
          </span>
        ) : (!readOnly && !isStrength && onMakeSystemic && (
          <button type="button" onClick={() => onMakeSystemic(finding)}
            className="text-[9px] font-bold uppercase tracking-wide text-forest-700 hover:bg-forest-50 border border-forest-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
            title="Étendre ce constat à des contrôles liés">
            <GitBranch size={9} /> Étendre
          </button>
        ))}

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

      <FindingBody
        finding={finding}
        readOnly={readOnly}
        onChange={onChange}
        templates={templates}
        onSaveTemplate={onSaveTemplate}
      />

      {!isStrength && (
        <div className="flex items-center gap-3 flex-wrap px-3 py-2 border-t border-gray-100 bg-gray-50/50">
          <div className="text-[10px] text-gray-500 inline-flex items-center gap-1.5">
            <span className="font-bold uppercase tracking-wide">Échéance proposée</span>
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
          {onPromote && (
            <div className="ml-auto">
              {finding.promoted_at ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest-700"><Check size={12} /> Promu au registre</span>
              ) : (
                <button type="button" onClick={() => onPromote(finding)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest-700 hover:text-forest-900">
                  <ArrowUpRight size={12} /> Promouvoir vers le registre
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
