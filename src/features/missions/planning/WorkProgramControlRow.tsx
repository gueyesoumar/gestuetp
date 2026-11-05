import type { Control, ControlPlanning, AuditTechnique } from '../../../types/database.types'
import type { MissionMemberRow, ControlAssignmentRow } from '../useMissionDetail'

interface WorkProgramControlRowProps {
  control: Control
  planning: ControlPlanning | undefined
  assignment: ControlAssignmentRow | undefined
  auditors: MissionMemberRow[]
  onPlanningChange: (controlId: string, field: string, value: unknown) => void
  onAssign: (controlId: string, auditorId: string) => void
  selected: boolean
  onToggleSelect: () => void
}

const TECHNIQUE_STYLES: Record<AuditTechnique, { short: string; cls: string }> = {
  inspection: { short: 'Inspection', cls: 'bg-blue-50 text-blue-600' },
  entretien: { short: 'Entretien', cls: 'bg-green-50 text-green-700' },
  observation: { short: 'Observation', cls: 'bg-yellow-50 text-yellow-700' },
  reexecution: { short: 'Re-exéc.', cls: 'bg-purple-50 text-purple-600' },
  echantillon: { short: 'Échantillon', cls: 'bg-orange-50 text-orange-600' },
  analytique: { short: 'Analytique', cls: 'bg-gray-100 text-gray-500' },
}

export function WorkProgramControlRow({ control, planning, assignment, auditors, onPlanningChange, onAssign, selected, onToggleSelect }: WorkProgramControlRowProps) {
  void onPlanningChange
  const techniques = planning?.audit_techniques ?? []
  const rowCls = selected ? 'bg-forest-50/60 hover:bg-forest-50' : 'hover:bg-forest-50/50'

  return (
    <>
      {/* Ligne 1 : Checkbox + Code + Nom + Auditeur */}
      <tr className={`${rowCls} transition-colors border-b-0`}>
        <td className="pl-4 pr-1 py-2.5 align-top" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="w-3.5 h-3.5 accent-forest-700 cursor-pointer"
            aria-label={`Sélectionner ${control.code}`}
          />
        </td>

        {/* Code */}
        <td className="px-2 py-2.5 align-top">
          <span className="font-mono text-[12px] font-semibold text-forest-700 whitespace-nowrap">{control.code}</span>
        </td>

        {/* Nom */}
        <td className="px-2 py-2.5 align-top">
          <span className="text-[13px] font-medium text-gray-900 leading-snug">{control.name}</span>
        </td>

        {/* Auditeur */}
        <td className="pl-2 pr-4 py-2.5 align-top">
          <select
            value={assignment?.auditor_id ?? ''}
            onChange={(e) => { if (e.target.value) onAssign(control.id, e.target.value) }}
            className={`text-[11px] border rounded px-1.5 py-1 outline-none focus:border-forest-500 w-full max-w-[130px] bg-transparent ${
              assignment ? 'border-transparent hover:border-gray-200' : 'border-gray-200'
            }`}
          >
            <option value="">Affecter...</option>
            {auditors.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.user.first_name[0]}. {a.user.last_name}
              </option>
            ))}
          </select>
        </td>
      </tr>

      {/* Ligne 2 : Techniques + Echantillonnage + Description */}
      <tr className={`${rowCls} transition-colors`}>
        <td></td>
        <td></td>
        <td colSpan={2} className="pl-2 pr-4 pb-3 pt-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {techniques.map((t) => (
              <span key={t} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${TECHNIQUE_STYLES[t]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                {TECHNIQUE_STYLES[t]?.short ?? t}
              </span>
            ))}
            {techniques.length === 0 && <span className="text-[10px] text-gray-300 italic">Aucune technique</span>}
            {planning?.sampling_population && (
              <span className="text-[10px] text-gray-400">{'·'} {'É'}ch. {planning.sampling_size}/{planning.sampling_population}</span>
            )}
            {control.description && (
              <span className="text-[10px] text-gray-300 truncate max-w-[400px]" title={control.description}>{'·'} {control.description}</span>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}
