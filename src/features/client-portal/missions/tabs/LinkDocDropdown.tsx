import { FileText, ArrowRight } from 'lucide-react'
import type { Document } from '../../../../types/database.types'

interface Props {
  available: Document[]
  evidenceName: string
  controlIds: string[]
  onLink: (
    existingDoc: { file_name: string; file_path: string; file_size: number | null; mime_type: string | null },
    evidenceName: string,
    controlIds?: string[],
  ) => void
  onClose: () => void
}

/** Dropdown de sélection d'un document existant à lier (extrait de ExpectedDocCard, CLAUDE.md §2). */
export function LinkDocDropdown({ available, evidenceName, controlIds, onLink, onClose }: Props): JSX.Element {
  return (
    <div className="mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
      <p className="text-[10px] font-semibold text-gray-500 mb-2">S&eacute;lectionner un document existant :</p>
      <div className="space-y-1">
        {available.map((d) => (
          <button key={d.id}
            onClick={() => onLink({ file_name: d.file_name, file_path: d.file_path, file_size: d.file_size, mime_type: d.mime_type }, evidenceName, controlIds)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-forest-50 transition-colors"
          >
            <FileText size={13} />
            <span className="text-[11px] text-gray-700 truncate flex-1">{d.file_name}</span>
            <span className="text-[9px] text-forest-700 font-medium shrink-0 inline-flex items-center gap-0.5">Lier <ArrowRight size={9} /></span>
          </button>
        ))}
      </div>
      <button onClick={onClose} className="mt-2 text-[9px] text-gray-400 hover:text-gray-600">Annuler</button>
    </div>
  )
}
