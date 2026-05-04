import { ChevronRight, ChevronLeft } from 'lucide-react'
import { AuditChecklistCard } from './AuditChecklistCard'
import { CadrageAnswersCard } from './CadrageAnswersCard'
import { useControlContext } from './useControlContext'

interface RightRailProps {
  missionId: string
  controlId: string | null
  collapsed: boolean
  onToggle: () => void
}

export function RightRail({ missionId, controlId, collapsed, onToggle }: RightRailProps) {
  const { auditChecklist, cadrageAnswers, hasInstance, loading } = useControlContext(missionId, controlId)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="w-7 shrink-0 border-l border-gray-200 bg-[#FAFAF8] hover:bg-forest-50 transition-colors flex items-start justify-center pt-3 group"
        aria-label="Afficher le contexte du contr&ocirc;le"
        title="Afficher le contexte"
      >
        <ChevronLeft size={14} className="text-gray-400 group-hover:text-forest-700" />
      </button>
    )
  }

  return (
    <aside className="w-80 shrink-0 border-l border-gray-200 bg-[#FAFAF8] overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Contexte du contr&ocirc;le</h4>
        <button
          type="button"
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Masquer le contexte"
          title="Masquer"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {!controlId ? (
          <p className="text-[11px] text-gray-400 italic text-center py-6">
            S&eacute;lectionnez un contr&ocirc;le pour voir son contexte.
          </p>
        ) : loading ? (
          <p className="text-[11px] text-gray-400 italic text-center py-4">Chargement...</p>
        ) : (
          <>
            <AuditChecklistCard items={auditChecklist} />
            <CadrageAnswersCard answers={cadrageAnswers} hasInstance={hasInstance} />
          </>
        )}
      </div>
    </aside>
  )
}
