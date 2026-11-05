import { X, Loader2 } from 'lucide-react'
import type { MissionMemberRow } from '../useMissionDetail'

interface WorkProgramBulkToolbarProps {
  selectedCount: number
  auditors: MissionMemberRow[]
  saving: boolean
  onClear: () => void
  onAssignAuditor: (auditorId: string) => Promise<void>
}

export function WorkProgramBulkToolbar({
  selectedCount,
  auditors,
  saving,
  onClear,
  onAssignAuditor,
}: WorkProgramBulkToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-forest-700 text-white border-b border-forest-900 sticky top-0 z-[2]">
      <button
        type="button"
        onClick={onClear}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-forest-900 transition-colors"
        aria-label="D&eacute;s&eacute;lectionner tout"
      >
        <X size={14} />
      </button>
      <span className="text-xs font-semibold mr-2">
        {selectedCount} contr&ocirc;le{selectedCount > 1 ? 's' : ''} s&eacute;lectionn&eacute;{selectedCount > 1 ? 's' : ''}
      </span>

      {saving && <Loader2 size={13} className="animate-spin text-gold-300 mr-1" />}

      {/* Assign auditor */}
      <select
        defaultValue=""
        disabled={saving}
        onChange={(e) => {
          if (e.target.value) {
            void onAssignAuditor(e.target.value)
            e.target.value = ''
          }
        }}
        className="text-[11px] bg-forest-900/40 border border-forest-900 rounded-lg px-2 py-1 text-white outline-none disabled:opacity-50"
      >
        <option value="" className="text-gray-700">Affecter &agrave;...</option>
        {auditors.map((a) => (
          <option key={a.user_id} value={a.user_id} className="text-gray-700">
            {a.user.first_name[0]}. {a.user.last_name}
          </option>
        ))}
      </select>

    </div>
  )
}
