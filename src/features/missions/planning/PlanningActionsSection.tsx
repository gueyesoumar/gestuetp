interface PlanningActionsSectionProps {
  assignedCount: number
  totalControls: number
  onValidate: () => void
}

export function PlanningActionsSection({ assignedCount, totalControls, onValidate }: PlanningActionsSectionProps) {
  const allAssigned = assignedCount === totalControls && totalControls > 0

  return (
    <div className="p-4">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Actions</h4>
      <div className="flex flex-col gap-2">
        <ActionButton icon="&#127922;" label="R&eacute;partition &eacute;quilibr&eacute;e auto" />
        <ActionButton icon="&#128203;" label="Exporter le programme (Excel)" />
        <ActionButton icon="&#128231;" label="Envoyer le planning au client" />
        <button
          onClick={onValidate}
          disabled={!allAssigned}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="w-6 text-center">&#10003;</span> Valider la planification
        </button>
      </div>
    </div>
  )
}

function ActionButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex items-center gap-2.5 px-3.5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 transition-colors text-left">
      <span className="w-6 text-center text-base">{icon}</span> {label}
    </button>
  )
}
