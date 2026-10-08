import { useState } from 'react'
import { MoreHorizontal, ChevronUp, ChevronDown, ChevronRight, Trash2, Sparkles, ArrowUpRight, Check, GitBranch, Pencil } from 'lucide-react'
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
  // Un constat déjà rédigé s'affiche replié ; un nouveau (vide) s'ouvre en édition.
  const [editing, setEditing] = useState(() => !finding.description?.trim())
  // Déroulé lecture seule du constat replié (voir le détail sans passer en édition).
  const [expanded, setExpanded] = useState(false)
  const classifCfg = getClassificationConfig(finding.classification)
  const isStrength = finding.classification === 'strength'

  const handleConfirmDelete = async (): Promise<void> => {
    setMenuOpen(false)
    if (!window.confirm('Supprimer ce constat ?')) return
    await onDelete()
  }
  const run = (fn: () => void): void => { setMenuOpen(false); fn() }
  const itemCls = 'w-full text-left text-[11.5px] px-3 py-2 rounded-md hover:bg-gray-100 inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed'

  const menu = !readOnly && (
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
  )

  // ----- Vue repliée : résumé sur une ligne (cliquable pour dérouler le détail) -----
  if (!editing) {
    const hasDetail = !!(finding.description?.trim() || finding.risk?.trim() || finding.recommendation?.trim())
    return (
      <div className={`border rounded-xl bg-white ${classifCfg.cardBorder}`}>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${classifCfg.pillBg}`}>{classifCfg.label}</span>
          {!isStrength && finding.priority && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{finding.priority === 'critical' ? 'Critique' : finding.priority === 'high' ? 'Haute' : finding.priority === 'medium' ? 'Moyenne' : 'Basse'}</span>
          )}
          <button
            type="button"
            onClick={() => hasDetail && setExpanded((v) => !v)}
            disabled={!hasDetail}
            aria-expanded={expanded}
            title={hasDetail ? (expanded ? 'Réduire le constat' : 'Dérouler le constat') : undefined}
            className="flex-1 min-w-0 inline-flex items-center gap-1.5 text-left group disabled:cursor-default"
          >
            {hasDetail && (expanded
              ? <ChevronDown size={13} className="shrink-0 text-gray-400 group-hover:text-forest-700" />
              : <ChevronRight size={13} className="shrink-0 text-gray-400 group-hover:text-forest-700" />)}
            <span className={`flex-1 min-w-0 text-[12px] text-gray-900 group-hover:text-forest-800 ${expanded ? '' : 'truncate'}`}>{finding.description || <em className="text-gray-400">Constat vide</em>}</span>
          </button>
          {!readOnly && (
            <button type="button" onClick={() => setEditing(true)} className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-900"><Pencil size={11} /> Modifier</button>
          )}
          {menu}
        </div>

        {expanded && hasDetail && (
          <div className="px-3 pb-3 pt-0.5 border-t border-gray-100 space-y-2.5">
            <ReadField label="Constat" value={finding.description} />
            {!isStrength && finding.risk?.trim() && <ReadField label="Risque" value={finding.risk} />}
            {!isStrength && finding.recommendation?.trim() && <ReadField label="Recommandation" value={finding.recommendation} />}
          </div>
        )}
      </div>
    )
  }

  // ----- Vue édition -----
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
        {menu}
      </div>

      <FindingBody finding={finding} readOnly={readOnly} onChange={onChange} templates={templates} onSaveTemplate={onSaveTemplate} />

      {!readOnly && (
        <div className="px-3 pb-3">
          <button type="button" onClick={() => setEditing(false)} disabled={!finding.description?.trim()}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white bg-forest-700 hover:bg-forest-900 px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
            <Check size={13} /> Valider
          </button>
        </div>
      )}
    </div>
  )
}

/** Champ en lecture seule du constat déroulé (constat / risque / recommandation). */
function ReadField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
      <p className="text-[12px] text-gray-700 whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}
