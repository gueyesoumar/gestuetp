import type { Control } from '../../../types/database.types'
import type { MissionMemberRow, ControlAssignmentRow } from '../useMissionDetail'

interface WorkProgramControlRowProps {
  control: Control
  assignment: ControlAssignmentRow | undefined
  auditors: MissionMemberRow[]
  onAssign: (controlId: string, auditorId: string) => void
  selected: boolean
  onToggleSelect: () => void
}

export function WorkProgramControlRow({ control, assignment, auditors, onAssign, selected, onToggleSelect }: WorkProgramControlRowProps) {
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

      {/* Ligne 2 : Description du contrôle */}
      <tr className={`${rowCls} transition-colors`}>
        <td></td>
        <td></td>
        <td colSpan={2} className="pl-2 pr-4 pb-3 pt-0">
          {control.description && (
            <span className="text-[11px] text-gray-400 truncate max-w-[520px] inline-block align-top" title={control.description}>{control.description}</span>
          )}
        </td>
      </tr>
    </>
  )
}
