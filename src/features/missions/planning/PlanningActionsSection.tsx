import { Shuffle, FileSpreadsheet, Mail } from 'lucide-react'
import type { ReactNode } from 'react'

export function PlanningActionsSection() {
  return (
    <div className="p-4">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Actions</h4>
      <div className="flex flex-col gap-2">
        <ActionButton icon={<Shuffle size={15} />} label="R&eacute;partition &eacute;quilibr&eacute;e auto" />
        <ActionButton icon={<FileSpreadsheet size={15} />} label="Exporter le programme (Excel)" />
        <ActionButton icon={<Mail size={15} />} label="Envoyer le planning au client" />
      </div>
    </div>
  )
}

function ActionButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-2.5 px-3.5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 transition-colors text-left">
      <span className="w-6 text-center flex justify-center">{icon}</span> {label}
    </button>
  )
}
