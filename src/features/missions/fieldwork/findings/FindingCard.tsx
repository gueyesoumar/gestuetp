import { useState } from 'react'
import { MoreHorizontal, ChevronUp, ChevronDown, Trash2, Sparkles, ArrowUpRight, Check, GitBranch } from 'lucide-react'
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
  onPromote?: (finding: AssessmentFinding) => void
  systemicCount?: number
  onMakeSystemic?: (finding: AssessmentFinding) => void
  templates?: FindingTemplate[]
  onSaveTemplate?: (input: SaveTemplateInput) => Promise<boolean>
}

export function FindingCard({ finding, index, total, readOnly, onChange, onDelete, onMoveUp, onMoveDown, onPromote, systemicCount, onMakeSystemic, templates = [], onSaveTemplate }: FindingCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const classifCfg = getClassificationConfig(finding.classification)
  const isStrength = finding.classification === 'strength'

  const handleConfirmDelete = async (): Promise<void> => {
    setMenuOpen(false)
    if (!window.confirm('Supprimer ce constat ?')) return
    await onDelete()
  }
  const run = (fn: () => void): void => { setMenuOpen(false); fn() }

  const itemCls = 'w-full text-left text-[11.5px] px-3 py-2 rounded-md hover:bg-gray-100 inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className={`border rounded-xl bg-white overflow-hidden ${classifCfg.cardBorder}`}>
      <div className={`flex items-center gap-2 flex-wrap px-3 py-2 ${classifCfg.cardBg} border-b ${classifCfg.cardBorder}`}>
        <span className="font-mono text-[10px] font-bold tracking-wide text-gray-500">CONSTAT {String(index + 1).padStart(2, '0')}</span>

        <FindingClassificationPicker value={finding.classification} readOnly={readOnly} onChange={(p) => { void onChange(p) }} />
        {!isStrength && <FindingPriorityPicker value={finding.priority} readOnly={readOnly} onChange={(p) => { void onChange(p) }} />}

        {finding.ai_generated && (
          <span className="text-[9px] font-bold uppercase tracking-wide text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Sparkles size={9} /> IA</span>
        )}
        {finding.systemic_group_id && (
          <span className="text-[9px] font-bold uppercase tracking-wide text-forest-700 bg-forest-50 border border-forest-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1" title="Constat répliqué sur plusieurs contrôles liés">
            <GitBranch size={9} /> Systémique{systemicCount && systemicCount > 1 ? ` · ${systemicCount}` : ''}
          </span>
        )}

        {!readOnly && (
          <div className="ml-auto relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Actions du constat"><MoreHorizontal size={15} /></button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-7 z-20 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                  <button type="button" className={itemCls} disabled={index === 0} onClick={() => run(() => void onMoveUp())}><ChevronUp size={13} /> Monter</button>
                  <button type="button" className={itemCls} disabled={index === total - 1} onClick={() => run(() => void onMoveDown())}><ChevronDown size={13} /> Descendre</button>
                  {!finding.systemic_group_id && !isStrength && onMakeSystemic && (
                    <button type="button" className={itemCls} onClick={() => run(() => onMakeSystemic(finding))}><GitBranch size={13} /> Étendre aux contrôles liés</button>
                  )}
                  {onPromote && (finding.promoted_at
                    ? <span className={`${itemCls} text-forest-700`}><Check size={13} /> Promu au registre</span>
                    : <button type="button" className={itemCls} onClick={() => run(() => onPromote(finding))}><ArrowUpRight size={13} /> Promouvoir vers le registre</button>
                  )}
                  <button type="button" className={`${itemCls} text-red-600 hover:bg-red-50`} onClick={() => void handleConfirmDelete()}><Trash2 size={13} /> Supprimer</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <FindingBody finding={finding} readOnly={readOnly} onChange={onChange} templates={templates} onSaveTemplate={onSaveTemplate} />
    </div>
  )
}
